import { CHAT_MAX_LENGTH } from "#shared/multi";

const BLOCKED = new Set([
  "arse",
  "asshole",
  "bitch",
  "boob",
  "boner",
  "cock",
  "cunt",
  "damn",
  "dick",
  "faggot",
  "fuck",
  "hell",
  "jackass",
  "nigger",
  "piss",
  "porn",
  "prick",
  "retard",
  "shit",
  "slut",
  "tits",
  "wanker",
  "whore",
]);

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "9": "g",
  $: "s",
  "@": "a",
};

function foldToken(token: string): string {
  let out = "";
  for (const char of token.toLowerCase()) {
    if (/[a-z]/.test(char)) {
      out += char;
    } else {
      const mapped = LEET[char];
      if (mapped) out += mapped;
    }
  }
  return out;
}

interface ModerationResult {
  text: string;
  moderated: boolean;
}
export function moderateChatText(raw: string): ModerationResult {
  const text = raw.replace(/\s+/g, " ").trim().slice(0, CHAT_MAX_LENGTH);
  if (text.length === 0) return { text: "", moderated: false };

  let moderated = false;
  const cleaned = text.split(" ").map((token) => {
    if (BLOCKED.has(foldToken(token))) {
      moderated = true;
      return "••••";
    }
    return token;
  });

  const collapsed = cleaned.map((token) => foldToken(token)).join("");
  for (const word of BLOCKED) {
    if (word.length >= 5 && collapsed.includes(word)) {
      return { text: "", moderated: true };
    }
  }

  return { text: cleaned.join(" ").trim(), moderated };
}
