import type { Mood } from "@shared/moves";

const MOUTHS: Record<Mood, string> = {
  confident: "M 9 22 Q 16 27 23 22",
  smug: "M 9 23 Q 17 24 24 19",
  nervous: "M 9 25 Q 16 19 23 25",
  gracious: "M 9 22 L 23 22",
};

export function Face({ mood }: { mood: Mood }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className="face"
      aria-hidden="true"
      fill="none"
      stroke="#3b3a38"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="16" cy="16" r="13" />
      <circle cx="11" cy="13" r=".8" fill="#3b3a38" />
      <circle cx="21" cy="13" r=".8" fill="#3b3a38" />
      <path d={MOUTHS[mood]} />
      {mood === "nervous" && <path d="M 26 6 q 2 3 0 5" stroke="#1f3f8f" />}
    </svg>
  );
}
