import type { MessageBus, Unsubscribe } from "#server/backend/bus";
import type { ServerMessage } from "#shared/multi";

export interface Receiver {
  receive(message: ServerMessage): void;
}

export interface Hub {
  attach(playerId: string, receiver: Receiver): void;
  detach(playerId: string, receiver: Receiver): void;
  has(playerId: string): boolean;
  deliver(playerId: string, message: ServerMessage): void;
}

const channelOf = (playerId: string) => `oxox:player:${playerId}`;

const isServerMessage = (value: unknown): value is ServerMessage =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { type?: unknown }).type === "string";

export function createHub(bus: MessageBus, onError: (error: unknown) => void): Hub {
  const locals = new Map<string, { receiver: Receiver; unsubscribe: Unsubscribe }>();

  return {
    attach(playerId, receiver) {
      const existing = locals.get(playerId);
      if (existing) {
        existing.receiver = receiver;
        return;
      }
      const entry = {
        receiver,
        unsubscribe: bus.subscribe(channelOf(playerId), (payload) => {
          if (isServerMessage(payload)) locals.get(playerId)?.receiver.receive(payload);
        }),
      };
      locals.set(playerId, entry);
    },

    detach(playerId, receiver) {
      const entry = locals.get(playerId);
      if (!entry || entry.receiver !== receiver) return;
      locals.delete(playerId);
      void entry.unsubscribe().catch(onError);
    },

    has: (playerId) => locals.has(playerId),

    deliver(playerId, message) {
      const local = locals.get(playerId);
      if (local) {
        local.receiver.receive(message);
        return;
      }
      void bus.publish(channelOf(playerId), message).catch(onError);
    },
  };
}
