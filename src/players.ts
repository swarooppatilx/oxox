import type { Mark } from "@shared/game";

export const HUMAN: Mark = "X";
export const OPPONENT: Mark = "O";

export const humanOpens = (round: number) => round % 2 === 0;
