import { randomUUID } from "node:crypto";

import type { Backend } from "@server/backend/index";
import type { Identity } from "@server/identity";
import type { Hub } from "@server/realtime/hub";
import {
  addChat,
  applyMove,
  dueAt,
  hostedRoom,
  join,
  leave,
  makeRoomCode,
  markDisconnected,
  matchedRoom,
  requestRematch,
  runDue,
  type Outcome,
} from "@server/realtime/roomLogic";
import type { MultiErrorCode, RoomState } from "@shared/multi";

const MAX_CONFLICT_RETRIES = 5;
const CODE_ATTEMPTS = 5;
const TIMER_SLACK_MS = 25;

export type RoomResult =
  { ok: true; room: RoomState | null } | { ok: false; code: MultiErrorCode; message: string };

type Mutation = (room: RoomState) => Outcome;

const gone: RoomResult = { ok: false, code: "room_not_found", message: "That game is gone." };

export interface RoomService {
  host(identity: Identity): Promise<RoomResult>;
  match(first: Identity, second: Identity): Promise<RoomResult>;
  join(code: string, identity: Identity): Promise<RoomResult>;
  move(roomId: string, playerId: string, index: number): Promise<RoomResult>;
  chat(roomId: string, playerId: string, text: string, moderated: boolean): Promise<RoomResult>;
  rematch(roomId: string, playerId: string): Promise<RoomResult>;
  leave(roomId: string, playerId: string): Promise<RoomResult>;
  disconnect(roomId: string, playerId: string): Promise<RoomResult>;
  watch(room: RoomState): void;
  close(): void;
}

export function createRoomService(
  backend: Backend,
  hub: Hub,
  onError: (error: unknown) => void,
): RoomService {
  const { rooms } = backend;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const now = () => Date.now();

  function unwatch(roomId: string): void {
    const timer = timers.get(roomId);
    if (timer) clearTimeout(timer);
    timers.delete(roomId);
  }

  function watch(room: RoomState): void {
    unwatch(room.id);
    if (!room.players.some((player) => hub.has(player.id))) return;
    const due = dueAt(room);
    if (due === null) return;
    const delay = Math.max(0, due - now()) + TIMER_SLACK_MS;
    timers.set(
      room.id,
      setTimeout(() => void tick(room.id), delay),
    );
  }

  function notify(room: RoomState): void {
    for (const player of room.players) hub.deliver(player.id, { type: "state", room });
    watch(room);
  }

  async function mutate(roomId: string, mutation: Mutation): Promise<RoomResult> {
    for (let attempt = 0; attempt < MAX_CONFLICT_RETRIES; attempt++) {
      const current = await rooms.get(roomId);
      if (!current) {
        unwatch(roomId);
        return gone;
      }
      const draft = structuredClone(current);
      const outcome = mutation(draft);
      if (!outcome.ok) return outcome;
      if (outcome.remove) {
        await rooms.remove(current);
        unwatch(roomId);
        return { ok: true, room: null };
      }
      if (!outcome.change) {
        watch(current);
        return { ok: true, room: current };
      }
      draft.version = current.version + 1;
      draft.lastActiveAt = now();
      if ((await rooms.save(draft, current.version)) === "ok") {
        notify(draft);
        return { ok: true, room: draft };
      }
    }
    throw new Error(`Room ${roomId} kept changing under concurrent writes`);
  }

  async function tick(roomId: string): Promise<void> {
    timers.delete(roomId);
    try {
      await mutate(roomId, (room) => runDue(room, now()));
    } catch (error) {
      onError(error);
    }
  }

  async function insert(build: (code: string) => RoomState): Promise<RoomResult> {
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
      const room = build(makeRoomCode());
      room.version = 1;
      if ((await rooms.save(room, 0)) === "ok") {
        notify(room);
        return { ok: true, room };
      }
    }
    throw new Error("Could not allocate a unique room code");
  }

  const newId = () => `room_${randomUUID()}`;

  return {
    host: (identity) => insert((code) => hostedRoom(newId(), code, identity, now())),
    match: (first, second) => insert((code) => matchedRoom(newId(), code, first, second, now())),

    async join(code, identity) {
      const room = await rooms.getByCode(code);
      if (!room) {
        return {
          ok: false,
          code: "room_not_found",
          message: "That code doesn't match any open game.",
        };
      }
      return mutate(room.id, (draft) => join(draft, identity, now()));
    },

    move: (roomId, playerId, index) =>
      mutate(roomId, (room) => applyMove(room, playerId, index, now())),
    chat: (roomId, playerId, text, moderated) =>
      mutate(roomId, (room) => addChat(room, playerId, text, moderated, now())),
    rematch: (roomId, playerId) => mutate(roomId, (room) => requestRematch(room, playerId, now())),
    leave: (roomId, playerId) => mutate(roomId, (room) => leave(room, playerId)),
    disconnect: (roomId, playerId) =>
      mutate(roomId, (room) => markDisconnected(room, playerId, now())),
    watch,

    close() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    },
  };
}
