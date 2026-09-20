import { createServer } from "node:http";

import { createWsApp } from "@server/realtime/app";
import { createSocketServer } from "@server/realtime/socketServer";

const server = createServer();
const app = createWsApp({ onError: (error) => console.error("[ws]", error) });
const wss = createSocketServer(app, { noServer: true });

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (client) => wss.emit("connection", client, request));
});

export default server;
