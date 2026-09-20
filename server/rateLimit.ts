import { getRedis } from "@server/backend/redis";

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

export function createSharedRateLimiter(name: string, limitPerMinute: number) {
  const redis = getRedis();
  const local = createRateLimiter(limitPerMinute);
  if (!redis) return async (client: string) => local(client);

  return async function check(client: string): Promise<number> {
    const now = Date.now();
    const bucket = Math.floor(now / WINDOW_MS);
    const key = `oxox:rate:${name}:${client}:${bucket}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.pexpire(key, WINDOW_MS);
      return count > limitPerMinute ? Math.ceil(((bucket + 1) * WINDOW_MS - now) / 1000) : 0;
    } catch {
      return 0;
    }
  };
}
