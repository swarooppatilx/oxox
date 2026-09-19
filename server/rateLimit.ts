const WINDOW_MS = 60_000;
const MAX_TRACKED_CLIENTS = 5000;

export function createRateLimiter(limitPerMinute: number) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return function check(client: string): number {
    const now = Date.now();
    if (windows.size >= MAX_TRACKED_CLIENTS) windows.clear();

    let window = windows.get(client);
    if (!window || now >= window.resetAt) {
      window = { count: 0, resetAt: now + WINDOW_MS };
      windows.set(client, window);
    }

    window.count++;
    return window.count > limitPerMinute ? Math.ceil((window.resetAt - now) / 1000) : 0;
  };
}
