const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function gtag(..._declared: unknown[]): void {
  window.dataLayer?.push(arguments);
}

export function initAnalytics(): void {
  if (!MEASUREMENT_ID) return;

  window.dataLayer = window.dataLayer ?? [];
  gtag("js", new Date());
  gtag("config", MEASUREMENT_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.append(script);
}

export function track(event: string, params?: Record<string, string | number>): void {
  if (!MEASUREMENT_ID) return;
  gtag("event", event, params);
}
