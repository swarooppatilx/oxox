import type { Redis } from "@upstash/redis";

export type BusHandler = (payload: unknown) => void;
export type Unsubscribe = () => Promise<void>;

export interface MessageBus {
  publish(channel: string, payload: unknown): Promise<void>;
  subscribe(channel: string, handler: BusHandler): Unsubscribe;
}

export class MemoryBus implements MessageBus {
  private readonly handlers = new Map<string, Set<BusHandler>>();

  async publish(channel: string, payload: unknown): Promise<void> {
    for (const handler of this.handlers.get(channel) ?? []) handler(structuredClone(payload));
  }

  subscribe(channel: string, handler: BusHandler): Unsubscribe {
    const set = this.handlers.get(channel) ?? new Set<BusHandler>();
    set.add(handler);
    this.handlers.set(channel, set);
    return async () => {
      set.delete(handler);
    };
  }
}

export class UpstashBus implements MessageBus {
  private readonly redis: Redis;
  private readonly onError: (error: unknown) => void;

  constructor(redis: Redis, onError: (error: unknown) => void) {
    this.redis = redis;
    this.onError = onError;
  }

  async publish(channel: string, payload: unknown): Promise<void> {
    await this.redis.publish(channel, payload);
  }

  subscribe(channel: string, handler: BusHandler): Unsubscribe {
    const subscriber = this.redis.subscribe<unknown>(channel);
    subscriber.on("message", ({ message }) => handler(message));
    subscriber.on("error", this.onError);
    return () => subscriber.unsubscribe();
  }
}
