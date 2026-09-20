import type { Redis } from "@upstash/redis";

import type { RoomState } from "#shared/multi";

const ROOM_TTL_SECONDS = 60 * 60 * 24;

export type SaveResult = "ok" | "conflict" | "code_taken";

export interface RoomStore {
  get(roomId: string): Promise<RoomState | null>;
  getByCode(code: string): Promise<RoomState | null>;
  save(room: RoomState, expectedVersion: number): Promise<SaveResult>;
  remove(room: RoomState): Promise<void>;
}

export class MemoryRoomStore implements RoomStore {
  private readonly rooms = new Map<string, RoomState>();
  private readonly codes = new Map<string, string>();

  async get(roomId: string): Promise<RoomState | null> {
    const room = this.rooms.get(roomId);
    return room ? structuredClone(room) : null;
  }

  async getByCode(code: string): Promise<RoomState | null> {
    const roomId = this.codes.get(code);
    return roomId ? this.get(roomId) : null;
  }

  async save(room: RoomState, expectedVersion: number): Promise<SaveResult> {
    const current = this.rooms.get(room.id);
    if ((current?.version ?? 0) !== expectedVersion) return "conflict";
    const owner = this.codes.get(room.code);
    if (owner !== undefined && owner !== room.id) return "code_taken";
    this.rooms.set(room.id, structuredClone(room));
    this.codes.set(room.code, room.id);
    return "ok";
  }

  async remove(room: RoomState): Promise<void> {
    this.rooms.delete(room.id);
    if (this.codes.get(room.code) === room.id) this.codes.delete(room.code);
  }
}

const SAVE_SCRIPT = `
local current = redis.call('GET', KEYS[1])
local version = 0
if current then version = cjson.decode(current).version end
if version ~= tonumber(ARGV[1]) then return 0 end
local owner = redis.call('GET', KEYS[2])
if owner and owner ~= ARGV[4] then return -1 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
redis.call('SET', KEYS[2], ARGV[4], 'EX', ARGV[3])
return 1
`;

const roomKey = (roomId: string) => `oxox:room:${roomId}`;
const codeKey = (code: string) => `oxox:code:${code}`;

export class UpstashRoomStore implements RoomStore {
  private readonly redis: Redis;
  private readonly saveScript;

  constructor(redis: Redis) {
    this.redis = redis;
    this.saveScript = redis.createScript(SAVE_SCRIPT);
  }

  get(roomId: string): Promise<RoomState | null> {
    return this.redis.get<RoomState>(roomKey(roomId));
  }

  async getByCode(code: string): Promise<RoomState | null> {
    const roomId = await this.redis.get<string>(codeKey(code));
    return roomId ? this.get(roomId) : null;
  }

  async save(room: RoomState, expectedVersion: number): Promise<SaveResult> {
    const result = await this.saveScript.exec(
      [roomKey(room.id), codeKey(room.code)],
      [String(expectedVersion), JSON.stringify(room), String(ROOM_TTL_SECONDS), room.id],
    );
    if (result === 1) return "ok";
    return result === -1 ? "code_taken" : "conflict";
  }

  async remove(room: RoomState): Promise<void> {
    await this.redis.del(roomKey(room.id), codeKey(room.code));
  }
}
