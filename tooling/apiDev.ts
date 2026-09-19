import { Readable } from "node:stream";
import { loadEnv, type Plugin } from "vite";

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
    },
  };
}
