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

  return (
    <g className="hand" opacity="0">
      <set attributeName="opacity" to="1" begin="0s" />
      {strokes.map((stroke) => (
        <animateMotion
          key={stroke.path}
          path={stroke.path}
          begin={`${stroke.begin}s`}
          dur={`${stroke.duration}s`}
          fill="freeze"
        />
      ))}
      <animate
        attributeName="opacity"
        to="0"
        begin={`${end}s`}
        dur={`${FADE_SECONDS}s`}
        fill="freeze"
      />
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
