import { useEffect, useId, useRef, useState } from "react";

import { CHAT_MAX_LENGTH, type ChatMessage, type MultiPlayer } from "#shared/multi";

import { MultiAvatar } from "@/components/MultiAvatar";

interface ChatProps {
  players: MultiPlayer[];
  messages: ChatMessage[];
  yourId: string;
  opponentName: string;
  error: string | null;
  onSend: (text: string) => void;
}

const NEAR_BOTTOM = 56;
const COUNTER_FROM = CHAT_MAX_LENGTH - 40;
const QUICK_REPLIES = ["gg", "Nice move!", "Oops", "Rematch?"];

const lastSeq = (messages: ChatMessage[]): number => messages[messages.length - 1]?.seq ?? 0;

export function Chat({ players, messages, yourId, opponentName, error, onSend }: ChatProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [seen, setSeen] = useState(() => lastSeq(messages));
  const panelId = useId();
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const barRef = useRef<HTMLButtonElement | null>(null);
  const nearBottomRef = useRef(true);

  const newest = lastSeq(messages);
  const unread = open
    ? 0
    : messages.filter((message) => message.seq > seen && message.from !== yourId).length;

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (list && nearBottomRef.current) list.scrollTop = list.scrollHeight;
  }, [open, newest]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
    nearBottomRef.current = true;
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) inputRef.current?.focus();
  }, [open]);

  const close = () => {
    setSeen(newest);
    setOpen(false);
    barRef.current?.focus();
  };

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
    nearBottomRef.current = true;
  };

  const latest = messages[messages.length - 1];
  const latestAuthor = latest ? players.find((player) => player.id === latest.from) : null;
  const preview = latest
    ? `${latest.from === yourId ? "You" : (latestAuthor?.name ?? "Them")}: ${
        latest.moderated && !latest.text ? "(removed)" : latest.text
      }`
    : "Pass a note";

  return (
    <div className="chat">
      <button
        ref={barRef}
        type="button"
        className={`chat-bar${unread > 0 ? " unread" : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
      >
        <span className="chat-bar-label">Chat</span>
        <span className="chat-bar-preview">{preview}</span>
        {unread > 0 && (
          <span className="chat-badge" aria-label={`${unread} new`}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <section
          id={panelId}
          className="chat-panel"
          aria-label="Chat with your opponent"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
        >
          <header className="chat-head">
            <h2>
              Chat<span> with {opponentName}</span>
            </h2>
            <button type="button" className="chat-close" onClick={close} aria-label="Close chat">
              ✕
            </button>
          </header>
          <div
            className="chat-list"
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            onScroll={(event) => {
              const list = event.currentTarget;
              nearBottomRef.current =
                list.scrollHeight - list.scrollTop - list.clientHeight < NEAR_BOTTOM;
            }}
          >
            {messages.length === 0 && <p className="chat-empty">Nothing yet. Say hi!</p>}
            {messages.map((message) => {
              const author = players.find((player) => player.id === message.from);
              const mine = message.from === yourId;
              const removed = message.moderated && message.text.length === 0;
              return (
                <p
                  className={`chat-msg${mine ? " mine" : ""}${removed ? " filtered" : ""}`}
                  key={message.seq}
                >
                  {!mine && <MultiAvatar seed={author?.avatar ?? "?"} size={24} />}
                  <span className="chat-body">
                    {!mine && <span className="chat-who">{author?.name ?? "Someone"}</span>}
                    {removed ? "(message removed)" : message.text}
                    {message.moderated && !removed && mine && (
                      <span className="chat-note"> · filtered</span>
                    )}
                  </span>
                </p>
              );
            })}
          </div>
          <div className="chat-quick" role="group" aria-label="Quick replies">
            {QUICK_REPLIES.map((reply) => (
              <button key={reply} type="button" onClick={() => onSend(reply)}>
                {reply}
              </button>
            ))}
          </div>
          <p className="chat-error" role="alert">
            {error ??
              (draft.length >= COUNTER_FROM ? `${CHAT_MAX_LENGTH - draft.length} left` : "")}
          </p>
          <form
            className="chat-row"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <input
              ref={inputRef}
              name="chat-message"
              className="chat-input"
              value={draft}
              maxLength={CHAT_MAX_LENGTH}
              placeholder="Pass a note…"
              aria-label="Chat message"
              autoComplete="off"
              enterKeyHint="send"
              onChange={(event) => setDraft(event.target.value)}
            />
            <button className="pen-button chat-send" type="submit" disabled={!draft.trim()}>
              Send
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
