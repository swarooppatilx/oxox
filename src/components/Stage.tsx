import type { ReactNode } from "react";

interface StageProps {
  badge?: ReactNode;
  children: ReactNode;
}

export function Stage({ badge, children }: StageProps) {
  return (
    <div className="board-wrap">
      <div className="stage">
        {badge}
        {children}
      </div>
    </div>
  );
}
