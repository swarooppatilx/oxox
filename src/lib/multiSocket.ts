import type { ClientMessage, ServerMessage } from "@shared/multi";

interface MultiSocketEvents {
  onOpen?: () => void;
  onMessage?: (message: ServerMessage) => void;
  onClose?: (willRetry: boolean) => void;
}

const MAX_RETRY_MS = 10_000;

function socketUrl(): string {
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${location.host}/api/ws`;
}

export class MultiSocket {
  private ws: WebSocket | null = null;
  private retryMs = 500;
  private closedByUser = false;
  private heartbeat: number | null = null;

  private readonly events: MultiSocketEvents;

  constructor(events: MultiSocketEvents) {
    this.events = events;
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  open(): void {
    this.closedByUser = false;
    this.connect();
  }

  private connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    if (this.closedByUser) return;

    const ws = new WebSocket(socketUrl());
    this.ws = ws;

    ws.onopen = () => {
      this.retryMs = 500;
      this.events.onOpen?.();
    };

    ws.onmessage = (event) => {
      let message: unknown;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (!isRecord(message) || typeof message.type !== "string") return;
      if (message.type === "ping") {
        this.send({ type: "pong" });
        return;
      }
      this.events.onMessage?.(message as ServerMessage);
    };

    ws.onclose = () => {
      if (this.heartbeat !== null) {
        clearInterval(this.heartbeat);
        this.heartbeat = null;
      }
      this.ws = null;
      if (this.closedByUser) {
        this.events.onClose?.(false);
        return;
      }
      this.events.onClose?.(true);
      this.retryMs = Math.min(MAX_RETRY_MS, this.retryMs * 2);
      this.heartbeat = window.setTimeout(() => this.connect(), this.retryMs);
    };
  }

  nudge(): void {
    if (this.closedByUser || this.connected) return;
    if (this.heartbeat !== null) {
      clearTimeout(this.heartbeat);
      this.heartbeat = null;
    }
    this.retryMs = 500;
    this.connect();
  }

  send(message: ClientMessage): void {
    if (this.connected) this.ws?.send(JSON.stringify(message));
  }

  close(): void {
    this.closedByUser = true;
    if (this.heartbeat !== null) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
