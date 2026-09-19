import type { Line } from "./game.js";

function noise(seed: number, channel: number): number {
  const x = Math.sin(seed * 127.1 + channel * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const jitter = (seed: number, channel: number, amount: number) =>
  (noise(seed, channel) - 0.5) * 2 * amount;

export function crossPaths(seed: number): [string, string] {
  const j = (channel: number, amount: number) => jitter(seed, channel, amount);
  return [
    `M ${24 + j(1, 4)} ${22 + j(2, 4)} Q ${50 + j(3, 6)} ${48 + j(4, 6)} ${78 + j(5, 4)} ${80 + j(6, 4)}`,
    `M ${78 + j(7, 4)} ${20 + j(8, 4)} Q ${52 + j(9, 6)} ${52 + j(10, 6)} ${22 + j(11, 4)} ${80 + j(12, 4)}`,
  ];
}

const KAPPA = 0.5523;

export function noughtPath(seed: number): string {
  const j = (channel: number, amount: number) => jitter(seed, channel, amount);
  const cx = 50 + j(1, 2);
  const cy = 50 + j(2, 2);
  const rx = 27 + j(3, 3);
  const ry = 28 + j(4, 3);
  return [
    `M ${cx - rx + 2} ${cy - 6}`,
    `C ${cx - rx} ${cy - ry * KAPPA - 8} ${cx - rx * KAPPA} ${cy - ry - 1} ${cx + 1} ${cy - ry}`,
    `C ${cx + rx * KAPPA} ${cy - ry} ${cx + rx} ${cy - ry * KAPPA} ${cx + rx} ${cy}`,
    `C ${cx + rx} ${cy + ry * KAPPA} ${cx + rx * KAPPA} ${cy + ry} ${cx} ${cy + ry}`,
    `C ${cx - rx * KAPPA} ${cy + ry} ${cx - rx - 1} ${cy + ry * KAPPA} ${cx - rx + 1} ${cy - 2 + j(5, 3)}`,
  ].join(" ");
}

export const GRID_PATHS = [
  "M 100 8 C 99 60, 101 140, 100 292",
  "M 200 6 C 201 90, 199 200, 200 294",
  "M 8 100 C 80 101, 220 99, 292 100",
  "M 6 200 C 100 199, 200 201, 294 200",
] as const;

export function winLinePath(line: Line): string {
  const center = (cell: number) =>
    [(cell % 3) * 100 + 50, Math.floor(cell / 3) * 100 + 50] as const;
  const [x1, y1] = center(line[0]);
  const [x2, y2] = center(line[2]);
  const overshootX = (x2 - x1) * 0.18;
  const overshootY = (y2 - y1) * 0.18;
  return `M ${x1 - overshootX} ${y1 - overshootY} L ${x2 + overshootX} ${y2 + overshootY}`;
}
