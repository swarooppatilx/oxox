import { useEffect, useRef } from "react";

function PencilShape() {
  return (
    <g>
      <polygon
        points="0,0 5,-1.5 26,-22 21,-27 1.5,-5"
        fill="#e0b93a"
        stroke="#3b3a38"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <polygon points="0,0 2.6,-0.8 0.8,-2.6" fill="#3b3a38" />
      <polygon
        points="21,-27 26,-22 29,-25 24,-30"
        fill="#e58f8f"
        stroke="#3b3a38"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </g>
  );
}

interface Stroke {
  path: string;
  begin: number;
  duration: number;
}

const FADE_SECONDS = 0.2;

export function DrawingHand({ strokes }: { strokes: readonly Stroke[] }) {
  const end = Math.max(...strokes.map((stroke) => stroke.begin + stroke.duration));
  const handRef = useRef<SVGGElement | null>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const group = handRef.current;
      if (!group) return;

      if (elapsed > end + FADE_SECONDS) {
        group.style.opacity = "0";
        return;
      }

      let point: { x: number; y: number } | null = null;
      for (let i = 0; i < strokes.length; i++) {
        const stroke = strokes[i];
        if (!stroke || elapsed < stroke.begin) continue;
        const path = pathRefs.current[i];
        const t = (elapsed - stroke.begin) / stroke.duration;
        if (path && t >= 0 && t <= 1) {
          const total = path.getTotalLength();
          point = path.getPointAtLength(Math.min(1, t) * total);
          break;
        }
      }

      group.style.opacity = point || elapsed < (strokes[0]?.begin ?? 0) ? "1" : "0";
      if (point) group.setAttribute("transform", `translate(${point.x} ${point.y})`);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [strokes, end]);

  return (
    <g ref={handRef} className="hand" opacity="0">
      {strokes.map((stroke, i) => (
        <path
          key={stroke.path}
          ref={(element) => {
            pathRefs.current[i] = element;
          }}
          d={stroke.path}
          fill="none"
          stroke="none"
          visibility="hidden"
        />
      ))}
      <PencilShape />
    </g>
  );
}

export function ThinkingPencil() {
  return (
    <svg
      className="thinking-pencil"
      viewBox="-4 -34 40 38"
      width="34"
      height="32"
      aria-hidden="true"
    >
      <PencilShape />
    </svg>
  );
}
