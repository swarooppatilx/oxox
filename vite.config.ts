import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { apiDevPlugin } from "#tooling/apiDev";
import { siteUrlPlugin } from "#tooling/siteUrl";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };

  return {
    // Allow ngrok hosts (ephemeral subdomains) so tunnels like
    // https://<random>.ngrok-free.app can reach the dev server.
    server: { allowedHosts: [".ngrok-free.app"] },
    plugins: [react(), siteUrlPlugin(env), apiDevPlugin(mode)],
    resolve: { alias: { "@": fromRoot("./src") } },
  };
});
