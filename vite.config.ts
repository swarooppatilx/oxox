import react from "@vitejs/plugin-react";
import { build } from "esbuild";
import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";

type Env = Readonly<Record<string, string | undefined>>;

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

function siteUrl(env: Env): string {
  const vercelHost =
    env.VERCEL_ENV === "production" ? env.VERCEL_PROJECT_PRODUCTION_URL : env.VERCEL_URL;
  const url = env.SITE_URL || (vercelHost && `https://${vercelHost}`) || "http://localhost:5173";
  return url.replace(/\/+$/, "");
}

function siteUrlPlugin(env: Env): Plugin {
  const url = siteUrl(env);

  return {
    name: "site-url",
    transformIndexHtml: (html) => html.replaceAll("%SITE_URL%", url),
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${url}/</loc></url>
</urlset>
`,
      });
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${url}/sitemap.xml\n`,
      });
    },
  };
}

function functionsPlugin(mode: string): Plugin {
  return {
    name: "functions",

    config() {
      for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
        process.env[key] ??= value;
      }
    },

    configureServer(server) {
      server.middlewares.use("/api/move", async (req, res) => {
        try {
          const { POST } = await server.ssrLoadModule("/server/functions/move.ts");
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

      server.httpServer?.on(
        "upgrade",
        async (request: IncomingMessage, socket: Socket, head: Buffer) => {
          const { pathname } = new URL(request.url ?? "/", "http://localhost");
          if (pathname !== "/api/ws") return;
          const { default: wsServer } = await server.ssrLoadModule("/server/functions/ws.ts");
          wsServer.emit("upgrade", request, socket, head);
        },
      );
    },

    async closeBundle() {
      await build({
        entryPoints: { ws: "server/functions/ws.ts", move: "server/functions/move.ts" },
        outdir: "build/functions",
        bundle: true,
        platform: "node",
        format: "esm",
        target: "node22",
        packages: "external",
        sourcemap: true,
        tsconfig: "tsconfig.json",
        logLevel: "warning",
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };

  return {
    server: { allowedHosts: [".ngrok-free.app"] },
    plugins: [react(), siteUrlPlugin(env), functionsPlugin(mode)],
    resolve: {
      alias: {
        "@": fromRoot("./src"),
        "@shared": fromRoot("./shared"),
        "@server": fromRoot("./server"),
      },
    },
  };
});
