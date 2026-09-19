import type { Outcome } from "@shared/series";

export function Stamp({ text, tone }: { text: string; tone: Outcome }) {
  return (
    <div className={`stamp stamp-${tone}`} aria-hidden="true">
      {text}
    </div>
  );
}
