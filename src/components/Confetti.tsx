import { useMemo, type CSSProperties } from "react";

const SCRAPS = 34;
const COLORS = ["#1f3f8f", "#c2352b", "#e0b93a", "#3b3a38", "#f6f0e1"];

interface Scrap {
  left: number;
  delay: number;
  duration: number;
  rotation: number;
  drift: number;
  width: number;
  color: string;
}

const between = (min: number, max: number) => min + Math.random() * (max - min);

export function Confetti() {
  const scraps = useMemo<Scrap[]>(
    () =>
      Array.from({ length: SCRAPS }, (_, i) => ({
        left: between(0, 100),
        delay: between(0, 0.5),
        duration: between(1.6, 3),
        rotation: between(0, 360),
        drift: between(-60, 60),
        width: between(8, 18),
        color: COLORS[i % COLORS.length] ?? "#1f3f8f",
      })),
    [],
  );

  return (
    <div className="confetti" aria-hidden="true">
      {scraps.map((scrap, i) => (
        <i
          key={i}
          style={
            {
              left: `${scrap.left}%`,
              width: scrap.width,
              height: scrap.width * 0.6,
              background: scrap.color,
              animationDelay: `${scrap.delay}s`,
              animationDuration: `${scrap.duration}s`,
              "--rotation": `${scrap.rotation}deg`,
              "--drift": `${scrap.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
