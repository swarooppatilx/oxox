import { createServer } from "node:http";

import { createWsApp } from "#server/realtime/app";
import { createSocketServer } from "#server/realtime/socketServer";

const server = createServer();
const app = createWsApp({ onError: (error) => console.error("[ws]", error) });
createSocketServer(app, { server });

export default server;
