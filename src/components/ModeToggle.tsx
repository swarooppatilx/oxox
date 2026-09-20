export type GameMode = "solo" | "online";

const MODE_LABELS: Record<GameMode, string> = {
  solo: "Solo",
  online: "Online",
};

const MODES: GameMode[] = ["solo", "online"];

export interface ModeToggleProps {
  mode: GameMode;
  onlineDisabled: boolean;
  onChange: (mode: GameMode) => void;
  confirming: boolean;
  confirmTarget: GameMode;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function ModeToggle({
  mode,
  onlineDisabled,
  onChange,
  confirming,
  confirmTarget,
  onConfirm,
  onDismiss,
}: ModeToggleProps) {
  return (
    <div className="mode-toggle">
      <nav className="mode-bar" data-mode={mode} aria-label="Game mode">
        {MODES.map((value) => (
          <button
            key={value}
            type="button"
            className={`mode-tab${mode === value ? " active" : ""}`}
            aria-pressed={mode === value}
            disabled={value === "online" && onlineDisabled}
            title={value === "online" && onlineDisabled ? "You're offline" : undefined}
            onClick={() => onChange(value)}
          >
            {MODE_LABELS[value]}
          </button>
        ))}
      </nav>
      {confirming && (
        <div className="mode-confirm" role="alertdialog" aria-label="Leave your match?">
          <p>Leave your game and switch to {MODE_LABELS[confirmTarget]}?</p>
          <div className="mode-confirm-actions">
            <button type="button" onClick={onDismiss}>
              Stay
            </button>
            <button type="button" className="danger" onClick={onConfirm}>
              Leave
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
