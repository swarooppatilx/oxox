interface ActionsProps {
  nextLabel: string;
  onNext: () => void;
  canShare: boolean;
  sharing: boolean;
  onShare: () => void;
}

export function Actions({ nextLabel, onNext, canShare, sharing, onShare }: ActionsProps) {
  return (
    <div className="actions">
      <button className="pen-button" onClick={onNext}>
        {nextLabel}
      </button>
      {canShare && (
        <button className="pen-button share" onClick={onShare} disabled={sharing}>
          {sharing ? "Drawing…" : "Share"}
        </button>
      )}
    </div>
  );
}
