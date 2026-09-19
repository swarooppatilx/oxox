import { crossPaths, noughtPath } from "@shared/markGeometry";

import { DrawingHand } from "@/components/Pencil";

interface MarkProps {
  seed: number;
  drawing: boolean;
}

const CROSS_STROKE_SECONDS = 0.28;
const NOUGHT_STROKE_SECONDS = 0.5;

export function CrossMark({ seed, drawing }: MarkProps) {
  const [first, second] = crossPaths(seed);
  return (
    <svg viewBox="0 0 100 100" className="mark ink-cross" aria-hidden="true">
      <path d={first} pathLength={1} className="stroke bleed first" />
      <path d={second} pathLength={1} className="stroke bleed second" />
      <path d={first} pathLength={1} className="stroke first" />
      <path d={second} pathLength={1} className="stroke second" />
      {drawing && (
        <DrawingHand
          strokes={[
            { path: first, begin: 0, duration: CROSS_STROKE_SECONDS },
            { path: second, begin: CROSS_STROKE_SECONDS, duration: CROSS_STROKE_SECONDS },
          ]}
        />
      )}
    </svg>
  );
}

export function NoughtMark({ seed, drawing }: MarkProps) {
  const path = noughtPath(seed);
  return (
    <svg viewBox="0 0 100 100" className="mark ink-nought" aria-hidden="true">
      <path d={path} pathLength={1} className="stroke bleed first" />
      <path d={path} pathLength={1} className="stroke first" />
      {drawing && <DrawingHand strokes={[{ path, begin: 0, duration: NOUGHT_STROKE_SECONDS }]} />}
    </svg>
  );
}
