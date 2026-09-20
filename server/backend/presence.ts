import type { Redis } from "@upstash/redis";

const PRESENCE_TTL_MS = 30_000;
const PRESENCE_KEY = "oxox:presence";

export interface Presence {
  sync(ids: string[], now: number): Promise<number>;
  drop(id: string): Promise<void>;
}

export class MemoryPresence implements Presence {
  async sync(ids: string[]): Promise<number> {
    return ids.length;
  }

  async drop(): Promise<void> {}
}

export class UpstashPresence implements Presence {
  private readonly redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async sync(ids: string[], now: number): Promise<number> {
    const pipeline = this.redis.pipeline();
    for (const id of ids) pipeline.zadd(PRESENCE_KEY, { score: now, member: id });
    pipeline.zremrangebyscore(PRESENCE_KEY, 0, now - PRESENCE_TTL_MS);
    pipeline.zcard(PRESENCE_KEY);
    pipeline.pexpire(PRESENCE_KEY, PRESENCE_TTL_MS * 2);
    const results = await pipeline.exec();
    const count = results[ids.length + 1];
    return typeof count === "number" ? count : ids.length;
  }

  async drop(id: string): Promise<void> {
    await this.redis.zrem(PRESENCE_KEY, id);
  }
}
