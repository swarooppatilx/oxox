import {
  CHAT_MAX_LENGTH,
  ROOM_CODE_LENGTH,
  cleanPlayerName,
  type MultiErrorCode,
} from "@shared/multi";

export type Command =
  | { type: "hello"; secret: string; name: string; avatar: string }
  | { type: "pong" }
  | { type: "queue" }
  | { type: "create" }
  | { type: "join"; code: string }
  | { type: "move"; index: number }
  | { type: "chat"; text: string }
  | { type: "rematch" }
  | { type: "leave" };

export type ParseResult =
  { ok: true; command: Command } | { ok: false; code: MultiErrorCode; message: string };

const MAX_SECRET_LENGTH = 64;
const MAX_AVATAR_LENGTH = 64;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const reject = (code: MultiErrorCode, message: string): ParseResult => ({
  ok: false,
  code,
  message,
});

const accept = (command: Command): ParseResult => ({ ok: true, command });

function parseHello(message: Record<string, unknown>): ParseResult {
  const { playerId, name, avatar } = message;
  const invalid = reject("bad_hello", "Pick a name to start playing.");
  if (typeof playerId !== "string" || playerId.length === 0) return invalid;
  if (playerId.length > MAX_SECRET_LENGTH) return invalid;
  if (typeof name !== "string" || typeof avatar !== "string") return invalid;
  if (avatar.length === 0 || avatar.length > MAX_AVATAR_LENGTH) return invalid;
  const cleaned = cleanPlayerName(name);
  if (cleaned.length === 0) return invalid;
  return accept({ type: "hello", secret: playerId, name: cleaned, avatar });
}

function parseJoin(message: Record<string, unknown>): ParseResult {
  const code =
    typeof message.code === "string"
      ? message.code
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
      : "";
  if (code.length !== ROOM_CODE_LENGTH) {
    return reject("bad_join", "That doesn't look like an invite code.");
  }
  return accept({ type: "join", code });
}

function parseMove(message: Record<string, unknown>): ParseResult {
  const { index } = message;
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index > 8) {
    return reject("illegal_move", "That square doesn't exist.");
  }
  return accept({ type: "move", index });
}

function parseChat(message: Record<string, unknown>): ParseResult {
  const text =
    typeof message.text === "string" ? message.text.trim().slice(0, CHAT_MAX_LENGTH) : "";
  return text.length === 0
    ? reject("bad_message", "Empty message.")
    : accept({ type: "chat", text });
}

export function parseCommand(raw: string): ParseResult {
  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    return reject("bad_message", "That message couldn't be read.");
  }
  if (!isRecord(message) || typeof message.type !== "string") {
    return reject("bad_message", "That message was malformed.");
  }
  switch (message.type) {
    case "hello":
      return parseHello(message);
    case "join":
      return parseJoin(message);
    case "move":
      return parseMove(message);
    case "chat":
      return parseChat(message);
    case "pong":
    case "queue":
    case "create":
    case "rematch":
    case "leave":
      return accept({ type: message.type });
    default:
      return reject("bad_message", "Unknown message type.");
  }
}
