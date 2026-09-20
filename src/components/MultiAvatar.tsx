import { Avatar, Style } from "@dicebear/core";
import sprouts from "@dicebear/styles/sprouts.json" with { type: "json" };
import { useMemo } from "react";

interface MultiAvatarProps {
  seed: string;
  size?: number;
}

const style = new Style(sprouts);
const cache = new Map<string, string>();

function avatarUri(seed: string): string {
  const hit = cache.get(seed);
  if (hit) return hit;
  const uri = new Avatar(style, { seed }).toDataUri();
  cache.set(seed, uri);
  return uri;
}

export function MultiAvatar({ seed, size = 28 }: MultiAvatarProps) {
  const src = useMemo(() => avatarUri(seed), [seed]);
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size }}>
      <img src={src} width={size} height={size} alt="" draggable={false} />
    </span>
  );
}
