import type { Redis } from "@upstash/redis";

import type { Identity as QueueEntry } from "@server/identity";

const QUEUE_TTL_MS = 30_000;

export interface MatchQueue {
  claim(entry: QueueEntry, now: number): Promise<QueueEntry | null>;
  leave(id: string): Promise<void>;
}

export class MemoryMatchQueue implements MatchQueue {
  private readonly waiting = new Map<string, { entry: QueueEntry; at: number }>();

  async claim(entry: QueueEntry, now: number): Promise<QueueEntry | null> {
    this.waiting.delete(entry.id);
    for (const [id, item] of this.waiting) {
      this.waiting.delete(id);
      if (now - item.at <= QUEUE_TTL_MS) return item.entry;
    }
    this.waiting.set(entry.id, { entry, at: now });
    return null;
  }

  async leave(id: string): Promise<void> {
    this.waiting.delete(id);
  }
}

const CLAIM_SCRIPT = `
redis.call('ZREM', KEYS[1], ARGV[1])
redis.call('HDEL', KEYS[2], ARGV[1])
local stale = redis.call('ZRANGEBYSCORE', KEYS[1], 0, tonumber(ARGV[3]) - tonumber(ARGV[4]))
for _, id in ipairs(stale) do
  redis.call('ZREM', KEYS[1], id)
  redis.call('HDEL', KEYS[2], id)
end
local popped = redis.call('ZPOPMIN', KEYS[1])
if popped[1] then
  local entry = redis.call('HGET', KEYS[2], popped[1])
  redis.call('HDEL', KEYS[2], popped[1])
  if entry then return entry end
end
redis.call('ZADD', KEYS[1], tonumber(ARGV[3]), ARGV[1])
redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])
return false
`;

const QUEUE_KEY = "oxox:queue";
const IDENTITY_KEY = "oxox:queue:identity";

export class UpstashMatchQueue implements MatchQueue {
  private readonly redis: Redis;
  private readonly claimScript;

  constructor(redis: Redis) {
    this.redis = redis;
    this.claimScript = redis.createScript(CLAIM_SCRIPT);
  }

  async claim(entry: QueueEntry, now: number): Promise<QueueEntry | null> {
    const result = await this.claimScript.exec(
      [QUEUE_KEY, IDENTITY_KEY],
      [entry.id, JSON.stringify(entry), String(now), String(QUEUE_TTL_MS)],
    );
    if (!result) return null;
    return typeof result === "string" ? (JSON.parse(result) as QueueEntry) : (result as QueueEntry);
  }

  async leave(id: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zrem(QUEUE_KEY, id);
    pipeline.hdel(IDENTITY_KEY, id);
    await pipeline.exec();
  }
}
