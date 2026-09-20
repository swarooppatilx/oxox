import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";

import { SERIES_LENGTH } from "@shared/config";
import { isDraw, winnerOf } from "@shared/game";
import { cleanPlayerName, opponentOf, playerOf, type RoomState } from "@shared/multi";
import { gamesPlayed, seriesResult, type Outcome } from "@shared/series";

import { Board } from "@/components/Board";
import { Chat } from "@/components/Chat";
import { Credit } from "@/components/Credit";
import { JoinForm } from "@/components/JoinForm";
import type { ModeToggleProps } from "@/components/ModeToggle";
import { MultiAvatar } from "@/components/MultiAvatar";
import { MultiScorecard } from "@/components/MultiScorecard";
import { NameField } from "@/components/NameField";
import { PageHeader } from "@/components/PageHeader";
import { ThinkingPencil } from "@/components/Pencil";
import { Stage } from "@/components/Stage";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { avatarFor, isValidName } from "@/lib/identity";
import { extractCode } from "@/lib/inviteCode";
import { friendlyError, JOIN_ERRORS } from "@/lib/multiCopy";
import { winLineOf } from "@/state/selectors";

const HOLES = 6;
const PENDING_TIMEOUT_MS = 10_000;
const ERROR_MS = 4_000;

type YourOutcome = "win" | "loss" | "draw" | null;

function outcomeForYou(room: RoomState, yourId: string): YourOutcome {
  const you = playerOf(room, yourId);
  if (!you) return null;
  if (room.status === "over") {
    const first = room.players[0];
    if (!first) return "draw";
    const yoursAreFirst = first.id === yourId;
    const result = seriesResult(room.series);
    if (result === "win") return yoursAreFirst ? "win" : "loss";
    if (result === "loss") return yoursAreFirst ? "loss" : "win";
    return "draw";
  }
  const winner = winnerOf(room.board);
  if (winner) return winner.mark === you.mark ? "win" : "loss";
  return isDraw(room.board) ? "draw" : null;
}

function perspectives(room: RoomState, yourId: string) {
  const yoursAreFirst = room.players[0]?.id === yourId;
  return {
    youScore: yoursAreFirst ? room.series.you : room.series.opponent,
    themScore: yoursAreFirst ? room.series.opponent : room.series.you,
  };
}

function stampInfo(
  room: RoomState,
  yourId: string,
  themName: string,
): { text: string; tone: Outcome } | null {
  const outcome = outcomeForYou(room, yourId);
  if (!outcome) return null;
  if (winnerOf(room.board) !== null || isDraw(room.board)) {
    const text =
      outcome === "win"
        ? "YOU WIN!"
        : outcome === "loss"
          ? `${themName.toUpperCase()} WINS`
          : "DRAW";
    return { text, tone: outcome };
  }
  const text = outcome === "win" ? "MATCH WON!" : outcome === "loss" ? "MATCH LOST" : "MATCH TIED";
  return { text, tone: outcome };
}

const readLinkCode = (): string | null => {
  const param = new URLSearchParams(location.search).get("room");
  return param ? extractCode(param) : null;
};

const stripLinkCode = (): void => {
  const url = new URL(location.href);
  if (!url.searchParams.has("room")) return;
  url.searchParams.delete("room");
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
};

const hasFinePointer = (): boolean =>
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const Holes = () => (
  <div className="holes" aria-hidden="true">
    {Array.from({ length: HOLES }, (_, i) => (
      <span key={i} />
    ))}
  </div>
);

const Dots = () => (
  <span className="dots" aria-hidden="true">
    <i />
    <i />
    <i />
  </span>
);

interface DockProps {
  status: ReactNode;
  tone?: "error";
  chip?: ReactNode;
  slot?: ReactNode;
  actions: ReactNode;
}

function Dock({ status, tone, chip, slot, actions }: DockProps) {
  return (
    <footer>
      <div className="status-line">
        <p className={`status${tone === "error" ? " err" : ""}`} role="status">
          {status}
        </p>
        {chip}
      </div>
      <div className="slot">{slot}</div>
      <div className="actions">{actions}</div>
      <Credit />
    </footer>
  );
}

interface OnlineGameProps {
  showToast: (message: string) => void;
  modeSwitch: ModeToggleProps;
  onLiveChange: (live: boolean) => void;
}

export function OnlineGame({ showToast, modeSwitch, onLiveChange }: OnlineGameProps) {
  const multi = useMultiplayer();
  const reducedMotion = useReducedMotion();
  const { profile, state } = multi;
  const { room } = state;
  const selfId = state.selfId ?? "";

  const networkUp = useOnlineStatus();
  const wasDown = useRef(false);
  const [draft, setDraft] = useState(profile.name);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [joinCode, setJoinCode] = useState(readLinkCode);
  const [invited] = useState(() => readLinkCode() !== null);
  const [autoFocusName] = useState(() => profile.name === "" && hasFinePointer());

  const nameReady = isValidName(draft);
  const online = state.socket === "open";
  const waiting = room !== null && room.status === "waiting" && room.players.length < 2;
  const live = waiting || room?.status === "active" || state.queued || state.pending !== null;

  const reportLive = useEffectEvent(onLiveChange);
  useEffect(() => {
    reportLive(live);
  }, [live]);

  const toastBack = useEffectEvent(() => showToast("Back online"));
  useEffect(() => {
    if (state.socket === "reconnecting") wasDown.current = true;
    if (state.socket === "open" && wasDown.current) {
      wasDown.current = false;
      toastBack();
    }
  }, [state.socket]);

  const autoJoined = useRef(false);
  const joinFromLink = useEffectEvent((code: string) => {
    autoJoined.current = true;
    stripLinkCode();
    multi.joinRoom(code);
  });
  useEffect(() => {
    if (autoJoined.current || !joinCode || !online || room || state.pending || !profile.name)
      return;
    joinFromLink(joinCode);
  }, [joinCode, online, room, state.pending, profile.name]);

  const timeoutPending = useEffectEvent(() => multi.timeout());
  useEffect(() => {
    if (!state.pending) return;
    const timer = window.setTimeout(timeoutPending, PENDING_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [state.pending]);

  const errorCode = state.error?.code ?? null;
  const clearError = useEffectEvent(() => multi.clearError());
  useEffect(() => {
    if (!errorCode || JOIN_ERRORS.has(errorCode)) return;
    const timer = window.setTimeout(clearError, ERROR_MS);
    return () => window.clearTimeout(timer);
  }, [errorCode]);

  useEffect(() => {
    if (!confirmLeave) return;
    const timer = window.setTimeout(() => setConfirmLeave(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmLeave]);

  const commitName = () => {
    const cleaned = cleanPlayerName(draft);
    setDraft(cleaned);
    if (cleaned !== profile.name) multi.setName(cleaned);
  };

  const errorText = state.error ? friendlyError(state.error.code) : null;
  const joinError = state.error && JOIN_ERRORS.has(state.error.code) ? errorText : null;
  const otherError = state.error && !JOIN_ERRORS.has(state.error.code) ? errorText : null;

  const shell = (
    scoreline: ReactNode,
    stage: ReactNode,
    dock: DockProps,
    key: string,
    badge?: ReactNode,
  ) => (
    <section className="page" key={key}>
      <Holes />
      <PageHeader modeSwitch={modeSwitch} />
      <div className="scoreline">{scoreline}</div>
      <Stage badge={badge}>{stage}</Stage>
      <Dock {...dock} />
    </section>
  );

  const nameField = (locked: boolean) => (
    <NameField
      seed={avatarFor(profile.salt, cleanPlayerName(draft))}
      value={draft}
      autoFocus={autoFocusName}
      locked={locked}
      onChange={setDraft}
      onCommit={commitName}
    />
  );

  const beforeAction = (action: () => void) => () => {
    commitName();
    action();
  };

  if (room && !waiting) {
    const you = playerOf(room, selfId);
    const them = opponentOf(room, selfId);
    const matchOver = room.status === "over";
    const roundDone = winnerOf(room.board) !== null || isDraw(room.board);
    const outcome = outcomeForYou(room, selfId);
    const canPlay = room.status === "active" && !roundDone && room.turn === you?.mark && online;
    const thinking =
      room.status === "active" && !roundDone && !!them && them.connected && room.turn === them.mark;
    const score = perspectives(room, selfId);
    const played = gamesPlayed(room.series);
    const gameNumber = Math.min(SERIES_LENGTH, roundDone ? played : played + 1);
    const rematchPending = room.rematch[selfId] === true;
    const themWantsRematch = them ? room.rematch[them.id] === true : false;
    const canRematch = room.players.length === 2 && them?.connected === true && online;

    const statusText = (() => {
      if (!online) return networkUp ? "Reconnecting…" : "You're offline";
      if (otherError) return otherError;
      if (room.notice) return room.notice;
      if (matchOver) {
        if (outcome === "win") return "You won the match!";
        if (outcome === "loss") return them ? `${them.name} won the match.` : "Your opponent left.";
        return "The match was a tie.";
      }
      if (roundDone) return "Next page…";
      if (!them || !them.connected) return them ? `${them.name} is away…` : "Waiting…";
      return room.turn === you?.mark ? "Your turn" : `${them.name} is thinking…`;
    })();

    const onLeave = () => {
      if (matchOver || confirmLeave) {
        multi.leave();
        return;
      }
      setConfirmLeave(true);
    };

    return (
      <section
        className={`page${room.round > 1 ? " flip" : ""}`}
        key={room.round > 1 ? `${room.id}-${room.round}` : "online"}
      >
        <Holes />
        <PageHeader modeSwitch={modeSwitch} />
        <div className="scoreline">
          {you && (
            <MultiScorecard
              series={room.series}
              gameNumber={gameNumber}
              youName={you.name}
              youMark={you.mark}
              youScore={score.youScore}
              themName={them?.name ?? "Opponent"}
              themMark={them?.mark ?? "O"}
              themScore={score.themScore}
              draws={room.series.draws}
            />
          )}
        </div>

        <Board
          board={room.board}
          round={room.round}
          lastMove={room.lastMove}
          winLine={winLineOf(room.board)}
          canPlay={canPlay}
          youMark={you?.mark}
          thinking={thinking}
          showHint={false}
          reducedMotion={reducedMotion}
          stamp={stampInfo(room, selfId, them?.name ?? "Your opponent")}
          confetti={outcome === "win"}
          shake={outcome === "loss"}
          onPlay={multi.play}
        />

        <footer>
          <div className="status-line">
            <p className={`status${(otherError && online) || !online ? " err" : ""}`} role="status">
              {statusText}
              {thinking && <ThinkingPencil />}
            </p>
            {them && (
              <span
                className="multi-chip"
                title={them.connected ? `${them.name} is here` : `${them.name} is away`}
              >
                <MultiAvatar seed={them.avatar} size={22} />
                <span className="multi-chip-name">{them.name}</span>
                <span className={`dot ${them.connected ? "on" : "off"}`} aria-hidden="true" />
              </span>
            )}
          </div>
          <div className="slot">
            <Chat
              players={room.players}
              opponentName={them?.name ?? "your opponent"}
              messages={room.chat}
              yourId={selfId}
              error={errorCode === "chat_limited" ? errorText : null}
              onSend={multi.sendChat}
            />
          </div>
          <div className="actions">
            <button className={`pen-button${confirmLeave ? " danger" : ""}`} onClick={onLeave}>
              {confirmLeave ? "Leave match?" : "Leave game"}
            </button>
            {matchOver && (
              <button
                className="pen-button primary"
                onClick={multi.requestRematch}
                disabled={!canRematch || rematchPending}
              >
                {rematchPending ? "Waiting…" : themWantsRematch ? "Accept rematch" : "Rematch"}
              </button>
            )}
          </div>
          <Credit />
        </footer>
      </section>
    );
  }

  if (waiting && room) {
    const shareInvite = async () => {
      const url = `${location.origin}/?room=${room.code}`;
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: "Noughts & Crosses",
            text: `Join my game of Noughts & Crosses. Invite code ${room.code}`,
            url,
          });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        showToast("Invite link copied");
      } catch {
        showToast(`Share the code ${room.code}`);
      }
    };
    return shell(
      nameField(true),
      <div className="stage-body">
        <p className="stage-title">Your invite code</p>
        <p className="invite-code" aria-label={`Invite code ${room.code}`}>
          {room.code.split("").map((char, i) => (
            <span key={i}>{char}</span>
          ))}
        </p>
      </div>,
      {
        status: (
          <>
            Waiting for a friend…
            <ThinkingPencil />
          </>
        ),
        slot: <p className="slot-note">Share the link. Anyone with it can join from any device.</p>,
        actions: (
          <>
            <button className="pen-button" onClick={multi.cancelPending}>
              Cancel
            </button>
            <button className="pen-button primary" onClick={shareInvite}>
              Share invite
            </button>
          </>
        ),
      },
      "online",
    );
  }

  if (state.queued || state.pending) {
    const label = state.queued
      ? "Looking for an opponent"
      : state.pending === "create"
        ? "Opening a new page"
        : state.pending === "resume"
          ? "Finding your game"
          : `Joining ${joinCode ?? "the game"}`;
    return shell(
      nameField(true),
      <div className="stage-body">
        <p className="stage-title">
          {label}
          <Dots />
        </p>
      </div>,
      {
        status: `${label}…`,
        slot: (
          <p className="slot-note">
            {state.queued ? "This usually takes a few seconds." : "Hang on a moment."}
          </p>
        ),
        actions: (
          <button className="pen-button" onClick={multi.cancelPending}>
            Cancel
          </button>
        ),
      },
      "online",
    );
  }

  const offline = state.socket === "reconnecting" || state.socket === "closed";
  if (offline) {
    return shell(
      nameField(false),
      <div className="stage-body">
        <p className="stage-title">
          {networkUp ? "Can\u2019t reach the game server" : "You\u2019re offline"}
          <Dots />
        </p>
      </div>,
      {
        status: "No connection",
        tone: "error",
        slot: (
          <p className="slot-note">
            {networkUp
              ? "We keep trying in the background."
              : "We\u2019ll reconnect when you\u2019re back."}{" "}
            Solo works offline.
          </p>
        ),
        actions: (
          <button className="pen-button primary" onClick={() => modeSwitch.onChange("solo")}>
            Play solo
          </button>
        ),
      },
      "online",
    );
  }

  const ready = online && nameReady;
  const lobbyStatus = !online
    ? "Connecting…"
    : !nameReady
      ? "Who's playing?"
      : joinError
        ? "Try another code"
        : invited && joinCode
          ? "Ready to join"
          : "Ready when you are";
  const lobbySlot = otherError ? (
    <p className="slot-note err" role="alert">
      {otherError}
    </p>
  ) : !nameReady ? (
    <p className="slot-note">
      {invited
        ? "A friend invited you. Add a name (up to 8 letters) to join."
        : "Pick a name, up to 8 letters, to play."}
    </p>
  ) : (
    <p className="slot-note">Quick match finds anyone waiting. Or invite a friend.</p>
  );

  return shell(
    nameField(false),
    <JoinForm
      initialCode={joinCode ?? ""}
      serverError={joinError}
      disabled={!ready}
      onJoin={(code) => {
        commitName();
        setJoinCode(code);
        stripLinkCode();
        multi.joinRoom(code);
      }}
      onEdit={multi.clearError}
    />,
    {
      status: lobbyStatus,
      slot: lobbySlot,
      actions: (
        <>
          <button className="pen-button" onClick={beforeAction(multi.hostRoom)} disabled={!ready}>
            Play a friend
          </button>
          <button
            className="pen-button primary"
            onClick={beforeAction(multi.quickMatch)}
            disabled={!ready}
          >
            Quick match
          </button>
        </>
      ),
    },
    "online",
    online ? (
      <p className={`presence${state.online === null ? " idle" : ""}`} role="status">
        <i className="live-dot" aria-hidden="true" />
        {state.online === null
          ? "Counting players"
          : state.online > 1
            ? `${state.online} players online`
            : "Just you here right now"}
      </p>
    ) : null,
  );
}
