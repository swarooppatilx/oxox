import { randomUUID } from "node:crypto";

import { createBackend, type Backend } from "@server/backend/index";
import { publicIdOf, type Identity } from "@server/identity";
import { createModerator } from "@server/moderation";
import { createRateLimiter } from "@server/rateLimit";
import { createHub, type Receiver } from "@server/realtime/hub";
import { parseCommand, type Command } from "@server/realtime/protocol";
import { createRoomService, type RoomResult } from "@server/realtime/roomService";
import {
  HEARTBEAT_MS,
  PONG_TIMEOUT_MS,
  PRESENCE_MS,
  type MultiErrorCode,
  type ServerMessage,
} from "@shared/multi";

export interface WsConnection {
  send(data: string): void;
  close(): void;
  onMessage(listener: (data: string) => void): void;
  onClose(listener: () => void): void;
}

export interface WsApp {
  handleConnection(socket: WsConnection): void;
  close(): void;
}

export interface WsAppOptions {
  backend?: Backend;
  onError?: (error: unknown) => void;
}

interface Conn extends Receiver {
  id: string;
  socket: WsConnection;
  identity: Identity | null;
  roomId: string | null;
  ignoredRoomId: string | null;
  queued: boolean;
  alive: boolean;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  pongTimer: ReturnType<typeof setTimeout> | null;
}

const MESSAGES_PER_MINUTE = 240;
const CHATS_PER_MINUTE = 12;

export function createWsApp(options: WsAppOptions = {}): WsApp {
  const report = options.onError ?? (() => undefined);
  const backend = options.backend ?? createBackend(report);
  const hub = createHub(backend.bus, report);
  const service = createRoomService(backend, hub, report);

  const everyone = new Set<Conn>();
  const identified = new Map<string, Conn>();
  const floodLimit = createRateLimiter(MESSAGES_PER_MINUTE);
  const chatLimit = createRateLimiter(CHATS_PER_MINUTE);
  const moderate = createModerator(process.env.TYPESAFE_API_KEY || undefined);
  let closed = false;

  const send = (conn: Conn, message: ServerMessage): void => {
    try {
      conn.socket.send(JSON.stringify(message));
    } catch (error) {
      report(error);
    }
  };

  const sendError = (conn: Conn, code: MultiErrorCode, message: string): void =>
    send(conn, { type: "error", code, message });

  const settle = (conn: Conn, result: RoomResult): void => {
    if (!result.ok) sendError(conn, result.code, result.message);
  };

  async function guarded(conn: Conn, task: () => Promise<void>): Promise<void> {
    try {
      await task();
    } catch (error) {
      report(error);
      sendError(conn, "server_error", "The game server hiccuped.");
    }
  }

  async function tickPresence(): Promise<void> {
    if (closed) return;
    let online = everyone.size;
    try {
      online = await backend.presence.sync(
        [...everyone].map((conn) => conn.id),
        Date.now(),
      );
    } catch (error) {
      report(error);
    }
    for (const conn of everyone) send(conn, { type: "presence", online });
  }

  const presenceTimer = setInterval(() => void tickPresence(), PRESENCE_MS);
  presenceTimer.unref?.();

  function identify(conn: Conn, identity: Identity): void {
    if (conn.identity && conn.identity.id !== identity.id) {
      hub.detach(conn.identity.id, conn);
      identified.delete(conn.identity.id);
    }
    const previous = identified.get(identity.id);
    if (previous && previous !== conn) previous.socket.close();
    conn.identity = identity;
    identified.set(identity.id, conn);
    hub.attach(identity.id, conn);
    send(conn, { type: "welcome", selfId: identity.id });
  }

  async function queue(conn: Conn, identity: Identity): Promise<void> {
    const partner = await backend.queue.claim(identity, Date.now());
    if (!partner) {
      conn.queued = true;
      send(conn, { type: "queued" });
      return;
    }
    settle(conn, await service.match(partner, identity));
  }

  async function leave(conn: Conn): Promise<void> {
    const identity = conn.identity;
    const roomId = conn.roomId;
    if (conn.queued && identity) {
      conn.queued = false;
      await backend.queue.leave(identity.id);
    } else if (roomId && identity) {
      conn.ignoredRoomId = roomId;
      conn.roomId = null;
      await service.leave(roomId, identity.id);
    }
    send(conn, { type: "left" });
  }

  function requireIdentity(conn: Conn): Identity | null {
    if (!conn.identity) sendError(conn, "not_ready", "Say hello first.");
    return conn.identity;
  }

  function dispatch(conn: Conn, command: Command): void {
    if (command.type === "pong") {
      conn.alive = true;
      if (conn.pongTimer) clearTimeout(conn.pongTimer);
      conn.pongTimer = null;
      return;
    }
    if (command.type === "hello") {
      identify(conn, {
        id: publicIdOf(command.secret),
        name: command.name,
        avatar: command.avatar,
      });
      return;
    }
    if (command.type === "leave") {
      void guarded(conn, () => leave(conn));
      return;
    }

    const identity = requireIdentity(conn);
    if (!identity) return;
    const roomId = conn.roomId;

    switch (command.type) {
      case "queue":
      case "create":
      case "join":
        if (roomId) {
          sendError(conn, "already_in_room", "You're already in a game.");
        } else if (command.type === "queue") {
          if (!conn.queued) void guarded(conn, () => queue(conn, identity));
        } else if (command.type === "create") {
          void guarded(conn, async () => settle(conn, await service.host(identity)));
        } else {
          const { code } = command;
          void guarded(conn, async () => settle(conn, await service.join(code, identity)));
        }
        return;
      case "move":
      case "chat":
      case "rematch":
        if (!roomId) {
          sendError(conn, "no_room", "Join a game first.");
          return;
        }
        void guarded(conn, async () => {
          if (command.type === "move") {
            settle(conn, await service.move(roomId, identity.id, command.index));
          } else if (command.type === "rematch") {
            settle(conn, await service.rematch(roomId, identity.id));
          } else if (chatLimit(conn.id) > 0) {
            sendError(conn, "chat_limited", "Slow down a little.");
          } else {
            const { text, moderated } = await moderate(command.text);
            settle(conn, await service.chat(roomId, identity.id, text, moderated));
          }
        });
    }
  }

  function handleMessage(conn: Conn, raw: string): void {
    if (closed) return;
    if (floodLimit(conn.id) > 0) {
      conn.socket.close();
      return;
    }
    const parsed = parseCommand(raw);
    if (parsed.ok) dispatch(conn, parsed.command);
    else sendError(conn, parsed.code, parsed.message);
  }

  function teardown(conn: Conn): void {
    everyone.delete(conn);
    void backend.presence.drop(conn.id).catch(report);
    if (conn.heartbeatTimer) clearInterval(conn.heartbeatTimer);
    if (conn.pongTimer) clearTimeout(conn.pongTimer);
    conn.alive = false;

    const { identity, roomId, queued } = conn;
    if (!identity) return;
    hub.detach(identity.id, conn);
    if (identified.get(identity.id) !== conn) return;
    identified.delete(identity.id);
    if (queued) void backend.queue.leave(identity.id).catch(report);
    if (roomId) void service.disconnect(roomId, identity.id).catch(report);
  }

  function startHeartbeat(conn: Conn): void {
    conn.heartbeatTimer = setInterval(() => {
      if (closed) return;
      if (!conn.alive) {
        conn.socket.close();
        return;
      }
      conn.alive = false;
      send(conn, { type: "ping" });
      conn.pongTimer = setTimeout(() => {
        if (!conn.alive) conn.socket.close();
      }, PONG_TIMEOUT_MS);
    }, HEARTBEAT_MS);
  }

  return {
    handleConnection(socket) {
      const conn: Conn = {
        id: randomUUID(),
        socket,
        identity: null,
        roomId: null,
        ignoredRoomId: null,
        queued: false,
        alive: true,
        heartbeatTimer: null,
        pongTimer: null,
        receive(message) {
          if (message.type === "state") {
            if (message.room.id === conn.ignoredRoomId) return;
            conn.ignoredRoomId = null;
            conn.roomId = message.room.id;
            conn.queued = false;
            service.watch(message.room);
          }
          send(conn, message);
        },
      };
      everyone.add(conn);
      void tickPresence();
      socket.onMessage((raw) => handleMessage(conn, raw));
      socket.onClose(() => teardown(conn));
      startHeartbeat(conn);
    },

    close() {
      closed = true;
      clearInterval(presenceTimer);
      service.close();
      for (const conn of everyone) {
        if (conn.heartbeatTimer) clearInterval(conn.heartbeatTimer);
        if (conn.pongTimer) clearTimeout(conn.pongTimer);
        conn.socket.close();
      }
      everyone.clear();
    },
  };
}
