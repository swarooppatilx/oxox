import type { Plugin } from "vite";

type Env = Readonly<Record<string, string | undefined>>;

function siteUrl(env: Env): string {
  const vercelHost =
    env.VERCEL_ENV === "production" ? env.VERCEL_PROJECT_PRODUCTION_URL : env.VERCEL_URL;
  const url = env.SITE_URL || (vercelHost && `https://${vercelHost}`) || "http://localhost:5173";
  return url.replace(/\/+$/, "");
}

export function siteUrlPlugin(env: Env): Plugin {
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
