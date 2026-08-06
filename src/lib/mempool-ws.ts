export type WsHandler = (msg: Record<string, unknown>) => void;

export type WsStatusHandler = (status: "connecting" | "connected" | "disconnected") => void;

/**
 * mempool.space live WebSocket client with reconnect + backoff.
 * Docs: want blocks | stats | mempool-blocks | live-2h-chart
 */
export class MempoolWs {
  private ws: WebSocket | null = null;
  private closed = false;
  private attempt = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private onMessage: WsHandler,
    private onStatus: WsStatusHandler,
  ) {}

  connect() {
    this.closed = false;
    this.open();
  }

  disconnect() {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.ws?.close();
    this.ws = null;
    this.onStatus("disconnected");
  }

  private open() {
    if (this.closed) return;
    this.onStatus("connecting");
    const ws = new WebSocket("wss://mempool.space/api/v1/ws");
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.onStatus("connected");
      ws.send(
        JSON.stringify({
          action: "want",
          data: ["blocks", "stats", "mempool-blocks"],
        }),
      );
      // Live tip sample arrives via want-stats `transactions`.
      // Txids deltas prune dots when txs are mined / evicted.
      ws.send(JSON.stringify({ "track-mempool-txids": true }));
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: "ping" }));
        }
      }, 30_000);
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data)) as Record<string, unknown>;
        this.onMessage(data);
      } catch {
        // ignore malformed
      }
    };

    ws.onerror = () => {
      // onclose will handle reconnect
    };

    ws.onclose = () => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.ws = null;
      if (this.closed) {
        this.onStatus("disconnected");
        return;
      }
      this.onStatus("disconnected");
      const delay = Math.min(30_000, 1000 * 2 ** this.attempt);
      this.attempt += 1;
      this.reconnectTimer = setTimeout(() => this.open(), delay);
    };
  }
}
