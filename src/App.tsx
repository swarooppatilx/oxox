import { useEffect, useState } from "react";

import { InkFilters } from "@/components/InkFilters";
import type { ModeToggleProps } from "@/components/ModeToggle";
import { OnlineGame } from "@/components/OnlineGame";
import { SoloGame } from "@/components/SoloGame";
import { Toast } from "@/components/Toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useToast } from "@/hooks/useToast";

export type GameMode = "solo" | "online";

export function App() {
  const [mode, setMode] = useState<GameMode>(() =>
    new URLSearchParams(location.search).get("room") ? "online" : "solo",
  );
  const [matchLive, setMatchLive] = useState(false);
  const [pendingMode, setPendingMode] = useState<GameMode | null>(null);
  const toast = useToast();
  const networkUp = useOnlineStatus();

  useEffect(() => {
    if (pendingMode === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPendingMode(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingMode]);

  const requestMode = (next: GameMode) => {
    if (next === mode) return;
    if (next === "online" && !networkUp) return;
    if (mode === "online" && matchLive) {
      setPendingMode(next);
      return;
    }
    setMode(next);
  };

  const confirmSwitch = () => {
    if (pendingMode) {
      setMode(pendingMode);
    }
    setPendingMode(null);
    setMatchLive(false);
  };
  const modeSwitch: ModeToggleProps = {
    mode,
    onlineDisabled: !networkUp,
    onChange: requestMode,
    confirming: pendingMode !== null,
    confirmTarget: pendingMode ?? "solo",
    onConfirm: confirmSwitch,
    onDismiss: () => setPendingMode(null),
  };

  return (
    <main className="desk">
      <InkFilters />
      <div className="sheet">
        <SoloGame hidden={mode !== "solo"} showToast={toast.show} modeSwitch={modeSwitch} />
        {mode === "online" && (
          <OnlineGame showToast={toast.show} modeSwitch={modeSwitch} onLiveChange={setMatchLive} />
        )}
      </div>
      <Toast message={toast.message} />
    </main>
  );
}
