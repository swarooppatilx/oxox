import { createJudgeChat } from "@server/jev";
import { CHAT_MAX_LENGTH, QUICK_REPLIES } from "@shared/multi";

const JEV_TIMEOUT_MS = 1500;
const JEV_COOLDOWN_MS = 10_000;
const MIN_JUDGED_LENGTH = 3;

interface ModerationResult {
  text: string;
  moderated: boolean;
}

export function createModerator(apiKey: string | undefined) {
  const judge = apiKey ? createJudgeChat(apiKey) : undefined;
  const quick = new Set(QUICK_REPLIES.map((reply) => reply.toLowerCase()));
  let unavailableUntil = 0;

  return async function moderate(raw: string): Promise<ModerationResult> {
    const text = raw.replace(/\s+/g, " ").trim().slice(0, CHAT_MAX_LENGTH);
    const skip =
      !judge ||
      text.length < MIN_JUDGED_LENGTH ||
      quick.has(text.toLowerCase()) ||
      Date.now() < unavailableUntil;
    if (skip) return { text, moderated: false };

    try {
      const fine = await judge(text, AbortSignal.timeout(JEV_TIMEOUT_MS));
      return fine ? { text, moderated: false } : { text: "", moderated: true };
    } catch (error) {
      unavailableUntil = Date.now() + JEV_COOLDOWN_MS;
      console.error("[jev] chat moderation unavailable, letting it through:", error);
      return { text, moderated: false };
    }
  };
}
