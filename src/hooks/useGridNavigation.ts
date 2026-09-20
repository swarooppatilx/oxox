import { useRef, useState, type KeyboardEvent } from "react";

import { CENTER } from "@shared/game";

const SIZE = 3;
const ARROWS: Record<string, readonly [dx: number, dy: number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const clamp = (value: number) => Math.min(SIZE - 1, Math.max(0, value));

export function useGridNavigation() {
  const [focusIndex, setFocusIndex] = useState(CENTER);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);

  const registerCell = (index: number) => (element: HTMLButtonElement | null) => {
    cells.current[index] = element;
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    let next: number;
    const arrow = ARROWS[event.key];
    if (arrow) {
      const column = clamp((index % SIZE) + arrow[0]);
      const row = clamp(Math.floor(index / SIZE) + arrow[1]);
      next = row * SIZE + column;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = SIZE * SIZE - 1;
    } else {
      return;
    }

    event.preventDefault();
    setFocusIndex(next);
    cells.current[next]?.focus();
  };

  return { focusIndex, setFocusIndex, registerCell, onKeyDown };
}
