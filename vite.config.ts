import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { apiDevPlugin } from "./tooling/apiDev.ts";
import { siteUrlPlugin } from "./tooling/siteUrl.ts";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };

  return {
    plugins: [react(), siteUrlPlugin(env), apiDevPlugin(mode)],
    resolve: { alias: { "@": fromRoot("./src"), "@shared": fromRoot("./shared") } },
  };
});
