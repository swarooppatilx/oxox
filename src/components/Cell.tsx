import type { KeyboardEvent, Ref } from "react";

import type { Cell as CellValue } from "@shared/game";

import { CrossMark, NoughtMark } from "@/components/Marks";
import { cellLabel } from "@/copy";

interface CellProps {
  index: number;
  mark: CellValue;
  seed: number;
  isLastMove: boolean;
  drawing: boolean;
  pulse: boolean;
  disabled: boolean;
  ghost: "X" | "O";
  focusable: boolean;
  register: Ref<HTMLButtonElement>;
  onPlay: () => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}

export function Cell({
  index,
  mark,
  seed,
  isLastMove,
  drawing,
  pulse,
  disabled,
  ghost,
  focusable,
  register,
  onPlay,
  onFocus,
  onKeyDown,
}: CellProps) {
  return (
    <button
      ref={register}
      className={`cell ghost-${ghost} ${isLastMove ? "last" : ""} ${pulse ? "pulse" : ""}`}
      tabIndex={focusable ? 0 : -1}
      aria-disabled={disabled}
      aria-label={cellLabel(index, mark)}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onClick={() => {
        if (!disabled) onPlay();
      }}
    >
      {mark === "X" && <CrossMark seed={seed} drawing={drawing} />}
      {mark === "O" && <NoughtMark seed={seed} drawing={drawing} />}
    </button>
  );
}
