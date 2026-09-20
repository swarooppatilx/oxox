import { useCallback, useEffect, useEffectEvent, useReducer, useRef, useState } from "react";

import {
  cleanPlayerName,
  type ClientMessage,
  type RoomState,
  type ServerMessage,
} from "#shared/multi";

import { avatarFor, loadProfile, saveProfile, type MultiProfile } from "@/lib/identity";
import { MultiSocket } from "@/lib/multiSocket";
import { initialMultiState, multiReducer, type MultiState } from "@/state/multi";
import { track } from "@/lib/analytics";

const RESUME_KEY = "oxox-multi-resume";

const readResume = (): string | null => {
  try {
    return localStorage.getItem(RESUME_KEY);
  } catch {
    return null;
  }
};

const syncResume = (room: RoomState): void => {
  try {
    if (room.status === "over") localStorage.removeItem(RESUME_KEY);
    else localStorage.setItem(RESUME_KEY, room.code);
  } catch {}
};

const clearResume = (): void => {
  try {
    localStorage.removeItem(RESUME_KEY);
  } catch {}
};

interface MultiPlayerControls {
  profile: MultiProfile;
  state: MultiState;
  setName: (name: string) => void;
  quickMatch: () => void;
  hostRoom: () => void;
  joinRoom: (code: string) => void;
  play: (index: number) => void;
  sendChat: (text: string) => void;
  requestRematch: () => void;
  leave: () => void;
  cancelPending: () => void;
  timeout: () => void;
  clearError: () => void;
}

export function useMultiplayer(): MultiPlayerControls {
  const [profile, setProfile] = useState<MultiProfile>(loadProfile);
  const profileRef = useRef(profile);

  const [state, dispatch] = useReducer(multiReducer, initialMultiState, (initial) => ({
    ...initial,
    pending: readResume() && profile.name ? ("resume" as const) : null,
  }));
  const clientRef = useRef<MultiSocket | null>(null);

  const handleServerMessage = useEffectEvent((message: ServerMessage) => {
    switch (message.type) {
      case "queued":
        dispatch({ type: "queued" });
        return;
      case "welcome":
        dispatch({ type: "welcome", selfId: message.selfId });
        return;
      case "presence":
        dispatch({ type: "presence", online: message.online });
        return;
      case "state":
        if (!state.room && message.room.players.length === 2 && message.room.status === "active") {
          track("multi_match_start");
        }
        dispatch({ type: "room", room: message.room });
        syncResume(message.room);
        return;
      case "left":
        clearResume();
        dispatch({ type: "left" });
        return;
      case "error":
        if (message.code === "room_not_found") clearResume();
        dispatch({ type: "error", code: message.code, message: message.message });
        return;
      default:
        return;
    }
  });

  useEffect(() => {
    const client = new MultiSocket({
      onOpen: () => {
        dispatch({ type: "socket", status: "open" });
        const current = profileRef.current;
        if (!current.name) {
          dispatch({ type: "clearPending" });
          return;
        }
        client.send({
          type: "hello",
          playerId: current.secret,
          name: current.name,
          avatar: current.avatar,
        });
        const resume = readResume();
        if (resume) client.send({ type: "join", code: resume });
      },
      onMessage: (message) => handleServerMessage(message),
      onClose: (willRetry) =>
        dispatch({ type: "socket", status: willRetry ? "reconnecting" : "closed" }),
    });
    clientRef.current = client;
    dispatch({ type: "socket", status: "connecting" });
    client.open();

    const wake = () => {
      if (document.visibilityState === "visible") client.nudge();
    };
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);

    return () => {
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
      clientRef.current = null;
      client.close();
    };
  }, []);

  const setName = useCallback((raw: string) => {
    const name = cleanPlayerName(raw);
    const next = {
      ...profileRef.current,
      name,
      avatar: avatarFor(profileRef.current.salt, name),
    };
    profileRef.current = next;
    setProfile(next);
    saveProfile(next);
    if (name) {
      clientRef.current?.send({
        type: "hello",
        playerId: next.secret,
        name,
        avatar: next.avatar,
      });
    }
  }, []);

  const send = useCallback((message: ClientMessage) => {
    clientRef.current?.send(message);
  }, []);

  const quickMatch = useCallback(() => send({ type: "queue" }), [send]);
  const hostRoom = useCallback(() => {
    dispatch({ type: "pending", value: "create" });
    send({ type: "create" });
  }, [send]);
  const joinRoom = useCallback(
    (code: string) => {
      dispatch({ type: "pending", value: "join" });
      send({ type: "join", code: code.toUpperCase() });
    },
    [send],
  );
  const play = useCallback(
    (index: number) => {
      if (typeof index === "number") track("multi_move");
      send({ type: "move", index });
    },
    [send],
  );
  const sendChat = useCallback(
    (text: string) => {
      track("multi_chat");
      send({ type: "chat", text });
    },
    [send],
  );
  const requestRematch = useCallback(() => {
    track("multi_rematch");
    send({ type: "rematch" });
  }, [send]);
  const leave = useCallback(() => {
    clearResume();
    send({ type: "leave" });
    if (!clientRef.current?.connected) dispatch({ type: "left" });
  }, [send]);
  const cancelPending = useCallback(() => {
    clearResume();
    send({ type: "leave" });
    dispatch({ type: "left" });
  }, [send]);
  const timeout = useCallback(() => dispatch({ type: "timeout" }), []);
  const clearError = useCallback(() => dispatch({ type: "clearError" }), []);

  return {
    profile,
    state,
    setName,
    quickMatch,
    hostRoom,
    joinRoom,
    play,
    sendChat,
    requestRematch,
    leave,
    cancelPending,
    timeout,
    clearError,
  };
}
