import type { Opponent } from "#shared/moves";

import { OpponentChip } from "@/components/OpponentChip";
import { ThinkingPencil } from "@/components/Pencil";

interface StatusLineProps {
  text: string;
  thinking: boolean;
  opponent: Opponent;
}

export function StatusLine({ text, thinking, opponent }: StatusLineProps) {
  return (
    <div className="status-line">
      <p className="status">
        {text}
        {thinking && <ThinkingPencil />}
      </p>
      <OpponentChip opponent={opponent} />
    </div>
  );
}
