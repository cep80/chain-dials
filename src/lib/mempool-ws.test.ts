import { afterEach, describe, expect, it, vi } from "vitest";
import { MempoolWs } from "./mempool-ws";

class Socket {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 1;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  constructor() { Socket.instances.push(this); }
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); Socket.instances = []; });

describe("Bitcoin socket lifecycle", () => {
  it("pauses while hidden, resumes once, and rejects callbacks from a retired socket", () => {
    vi.useFakeTimers();
    const doc = Object.assign(new EventTarget(), { hidden: false });
    vi.stubGlobal("document", doc);
    vi.stubGlobal("WebSocket", Socket);
    const receive = vi.fn();
    const client = new MempoolWs(receive, vi.fn());
    client.connect();
    client.connect();
    expect(Socket.instances).toHaveLength(1);
    const first = Socket.instances[0];
    first.onopen!();
    const lateMessage = first.onmessage!;
    const lateClose = first.onclose!;
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(first.close).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(120_000);
    expect(Socket.instances).toHaveLength(1);
    doc.hidden = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(Socket.instances).toHaveLength(2);
    lateMessage({ data: '{"block":{"height":1}}' });
    lateClose();
    expect(receive).not.toHaveBeenCalled();
    Socket.instances[1].onmessage!({ data: '{"block":{"height":2}}' });
    expect(receive).toHaveBeenCalledWith({ block: { height: 2 } });
    client.disconnect();
    doc.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(120_000);
    expect(Socket.instances).toHaveLength(2);
  });

  it("backs off reconnects and cancels a pending reconnect on teardown", () => {
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", Socket);
    const client = new MempoolWs(vi.fn(), vi.fn());
    client.connect();
    Socket.instances[0].onclose!();
    vi.advanceTimersByTime(999);
    expect(Socket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(Socket.instances).toHaveLength(2);
    Socket.instances[1].onclose!();
    vi.advanceTimersByTime(1999);
    expect(Socket.instances).toHaveLength(2);
    client.disconnect();
    vi.advanceTimersByTime(60_000);
    expect(Socket.instances).toHaveLength(2);
  });
});
