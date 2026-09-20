import type { MultiErrorCode } from "#shared/multi";

const COPY: Record<MultiErrorCode, string> = {
  bad_message: "Something went wrong. Give it another go.",
  bad_hello: "Pick a name first (up to 8 characters).",
  bad_join: "That doesn't look like an invite code.",
  not_ready: "Pick a name first (up to 8 characters).",
  already_in_room: "You're already in a game.",
  no_room: "You're not in a game right now.",
  room_not_found: "We couldn't find that game. Check the code or ask for a fresh link.",
  room_full: "That game already has two players.",
  not_your_turn: "Hold on, it's their turn.",
  illegal_move: "That square is taken.",
  chat_limited: "Slow down a little, too many notes.",
  server_error: "The game server hiccuped. Give it another go.",
};

export const friendlyError = (code: MultiErrorCode): string => COPY[code];

export const JOIN_ERRORS: ReadonlySet<MultiErrorCode> = new Set([
  "bad_join",
  "room_not_found",
  "room_full",
  "already_in_room",
]);
