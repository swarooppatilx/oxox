import type { IncomingMessage } from "node:http";
import { WebSocketServer, type ServerOptions, type WebSocket } from "ws";

import { isSameSite } from "@server/origin";
import type { WsApp, WsConnection } from "@server/realtime/app";

const MAX_MESSAGE_BYTES = 2048;

const toConnection = (socket: WebSocket): WsConnection => ({
  send: (data) => socket.send(data),
  close: () => socket.close(),
  onMessage: (listener) => socket.on("message", (data) => listener(data.toString())),
  onClose: (listener) => socket.on("close", () => listener()),
});

const single = (header: string | string[] | undefined): string | undefined =>
  Array.isArray(header) ? header[0] : header;

const isAllowed = (request: IncomingMessage): boolean =>
  isSameSite(single(request.headers.origin), [
    single(request.headers.host),
    single(request.headers["x-forwarded-host"]),
  ]);

export function createSocketServer(app: WsApp, options: ServerOptions): WebSocketServer {
  const wss = new WebSocketServer({
    ...options,
    maxPayload: MAX_MESSAGE_BYTES,
    verifyClient: ({ req }: { req: IncomingMessage }) => isAllowed(req),
  });
  wss.on("connection", (socket) => app.handleConnection(toConnection(socket)));
  return wss;
}
