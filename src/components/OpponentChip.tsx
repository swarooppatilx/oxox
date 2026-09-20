import { useId } from "react";

import type { Opponent } from "@shared/moves";

import { OPPONENT_CHIP } from "@/copy";

export function OpponentChip({ opponent }: { opponent: Opponent }) {
  const descriptionId = useId();
  const { label, description } = OPPONENT_CHIP[opponent];

  return (
    <span
      className={`opponent-chip ${opponent}`}
      title={description}
      aria-describedby={descriptionId}
    >
      {label}
      <span id={descriptionId} className="sr-only">
        {description}
      </span>
    </span>
  );
}
