import type { Mood } from "#shared/moves";

import { Face } from "@/components/Face";

interface StickyNoteProps {
  mood: Mood;
  warning: boolean;
  text: string;
}

export function StickyNote({ mood, warning, text }: StickyNoteProps) {
  return (
    <div className={`sticky ${warning ? "warn" : ""}`}>
      <Face mood={mood} />
      <p>
        {warning && <b>Careful! </b>}
        {text}
      </p>
    </div>
  );
}
