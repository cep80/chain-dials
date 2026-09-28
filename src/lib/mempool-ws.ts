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
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", this.onVisibility);
    this.open();
  }

  disconnect() {
    this.closed = true;
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.onVisibility);
    this.releaseSocket();
  }

  private onVisibility = () => {
    if (document.hidden) this.releaseSocket();
    else this.open();
  };

  private releaseSocket() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.reconnectTimer = null;
    this.pingTimer = null;
    const old = this.ws;
    this.ws = null;
    if (old) {
      old.onopen = old.onmessage = old.onclose = old.onerror = null;
      old.close();
    }
    this.onStatus("disconnected");
  }

  private open() {
    if (this.closed || this.ws || (typeof document !== "undefined" && document.hidden)) return;
    this.onStatus("connecting");
    const ws = new WebSocket("wss://mempool.space/api/v1/ws");
    this.ws = ws;

    ws.onopen = () => {
      if (this.closed || this.ws !== ws) return;
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
      if (this.closed || this.ws !== ws) return;
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
      if (this.ws !== ws) return;
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
