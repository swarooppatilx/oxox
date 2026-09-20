import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import { loadEnv, type Plugin } from "vite";

import { createWsApp } from "#server/realtime/app";
import { createSocketServer } from "#server/realtime/socketServer";

export function apiDevPlugin(mode: string): Plugin {
  return {
    name: "api-dev",
    config() {
      for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
        process.env[key] ??= value;
      }
    },
    configureServer(server) {
      server.middlewares.use("/api/move", async (req, res) => {
        try {
          const { POST } = await server.ssrLoadModule("/api/move.ts");
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method === "POST" ? (Readable.toWeb(req) as ReadableStream) : undefined,
            duplex: "half",
          } as RequestInit);

          const response: Response = await POST(request);
          res.statusCode = response.status;
          response.headers.forEach((value, name) => res.setHeader(name, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          console.error("[api/move]", error);
          res.statusCode = 500;
          res.end();
        }
      });

      const app = createWsApp({ onError: (error) => console.error("[ws]", error) });
      const wss = createSocketServer(app, { noServer: true });

      const onUpgrade = (request: IncomingMessage, socket: Socket, head: Buffer) => {
        const { pathname } = new URL(request.url ?? "/", "http://localhost");
        if (pathname !== "/api/ws") return;
        wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
      };

      if (server.httpServer) {
        server.httpServer.on("upgrade", onUpgrade);
        server.httpServer.once("close", () => {
          app.close();
          for (const client of wss.clients) client.terminate();
          wss.close();
        });
      }
    },
  };
}
