import { MemoryBus, UpstashBus, type MessageBus } from "@server/backend/bus";
import { MemoryPresence, UpstashPresence, type Presence } from "@server/backend/presence";
import { MemoryMatchQueue, UpstashMatchQueue, type MatchQueue } from "@server/backend/queue";
import { getRedis } from "@server/backend/redis";
import { MemoryRoomStore, UpstashRoomStore, type RoomStore } from "@server/backend/rooms";

export interface Backend {
  rooms: RoomStore;
  queue: MatchQueue;
  presence: Presence;
  bus: MessageBus;
}

export function createBackend(onError: (error: unknown) => void): Backend {
  const redis = getRedis();
  if (!redis) {
    return {
      rooms: new MemoryRoomStore(),
      queue: new MemoryMatchQueue(),
      presence: new MemoryPresence(),
      bus: new MemoryBus(),
    };
  }
  return {
    rooms: new UpstashRoomStore(redis),
    queue: new UpstashMatchQueue(redis),
    presence: new UpstashPresence(redis),
    bus: new UpstashBus(redis, onError),
  };
}
