import type { MultiErrorCode, RoomState } from "@shared/multi";

type SocketStatus = "idle" | "connecting" | "open" | "reconnecting" | "closed";
type Pending = "join" | "create" | "resume";

interface MultiError {
  code: MultiErrorCode;
  message: string;
}

export interface MultiState {
  socket: SocketStatus;
  selfId: string | null;
  room: RoomState | null;
  queued: boolean;
  pending: Pending | null;
  online: number | null;
  error: MultiError | null;
}

export const initialMultiState: MultiState = {
  socket: "idle",
  selfId: null,
  room: null,
  queued: false,
  pending: null,
  online: null,
  error: null,
};

type MultiAction =
  | { type: "socket"; status: SocketStatus }
  | { type: "welcome"; selfId: string }
  | { type: "queued" }
  | { type: "presence"; online: number }
  | { type: "pending"; value: Pending }
  | { type: "clearPending" }
  | { type: "timeout" }
  | { type: "room"; room: RoomState }
  | { type: "left" }
  | { type: "error"; code: MultiErrorCode; message: string }
  | { type: "clearError" };

export function multiReducer(state: MultiState, action: MultiAction): MultiState {
  switch (action.type) {
    case "socket":
      if (action.status === "open") return { ...state, socket: action.status };
      return {
        ...state,
        socket: action.status,
        online: null,
        queued: false,
        pending: state.pending === "resume" ? "resume" : null,
      };
    case "welcome":
      return { ...state, selfId: action.selfId };
    case "presence":
      return { ...state, online: action.online };
    case "queued":
      return { ...state, queued: true, pending: null, error: null };
    case "pending":
      return { ...state, pending: action.value, error: null };
    case "clearPending":
      return { ...state, pending: null };
    case "timeout":
      return {
        ...state,
        pending: null,
        queued: false,
        error: { code: "bad_message", message: "The server didn't answer." },
      };
    case "room":
      return { ...state, room: action.room, queued: false, pending: null, error: null };
    case "left":
      return { ...state, room: null, queued: false, pending: null };
    case "error": {
      const silent = state.pending === "resume" && action.code === "room_not_found";
      const ended = action.code === "room_not_found" && state.room !== null;
      return {
        ...state,
        room: ended ? null : state.room,
        pending: null,
        queued: false,
        error: silent ? null : { code: action.code, message: action.message },
      };
    }
    case "clearError":
      return { ...state, error: null };
    default:
      return state;
  }
}
