import { Redis } from "@upstash/redis";

let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    client = url && token ? new Redis({ url, token }) : null;
  }
  return client;
}
