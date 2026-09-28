export interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  updatedAt: number | null;
  dataRequestedAt: number | null;
  retryAt: number | null;
}

export interface ResourceOptions {
  staleMs: number;
  pollMs?: number;
}

type Listener = () => void;
const EMPTY: ResourceState<never> = { data: null, loading: false, error: null, updatedAt: null, dataRequestedAt: null, retryAt: null };
export const emptyResourceState = <T>(): ResourceState<T> => EMPTY;

/** One lifecycle per URL, shared by every mounted consumer. */
export class JsonResource<T> {
  private state: ResourceState<T> = EMPTY;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private request: Promise<void> | null = null;
  private controller: AbortController | null = null;
  private failures = 0;

  constructor(readonly url: string, private options: ResourceOptions) {}

  getSnapshot = (): ResourceState<T> => this.state;
  private publish(patch: Partial<ResourceState<T>>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private visible = () => typeof document === "undefined" || document.visibilityState !== "hidden";
  private onVisibility = () => {
    if (!this.visible()) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      this.controller?.abort();
    } else {
      void this.refresh();
    }
  };
  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.listeners.size || !this.visible()) return;
    const now = Date.now();
    const delay = this.state.retryAt != null
      ? Math.max(1, this.state.retryAt - now)
      : this.options.pollMs;
    if (delay == null) return;
    this.timer = setTimeout(() => void this.refresh(), delay);
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      if (typeof document !== "undefined") document.addEventListener("visibilitychange", this.onVisibility);
      // Defer publishing until React has completed subscribing.
      queueMicrotask(() => { if (this.listeners.size) void this.refresh(); });
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size) return;
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.onVisibility);
      this.controller?.abort();
    };
  };

  refresh = (force = false): Promise<void> => {
    if (this.request) return this.request;
    const now = Date.now();
    // Even manual refresh respects provider backoff.
    if (!this.visible() || (this.state.retryAt != null && now < this.state.retryAt) ||
      (!force && !this.state.error && this.state.updatedAt != null && now - this.state.updatedAt < this.options.staleMs)) {
      this.schedule();
      return Promise.resolve();
    }
    const controller = new AbortController();
    this.controller = controller;
    this.publish({ loading: true });
    this.request = (async () => {
      let retryAfterMs = 0;
      const timeout = setTimeout(() => controller.abort(new Error("Request timed out")), 20_000);
      try {
        const response = await fetch(this.url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          const retryAfter = response.headers.get("retry-after");
          if (retryAfter) {
            const seconds = Number(retryAfter);
            retryAfterMs = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
          }
          throw new Error(response.status === 429 ? "Provider rate limit reached. Retrying shortly." : "Unable to refresh this reading.");
        }
        const data = await response.json() as T;
        if (controller.signal.aborted) return;
        this.failures = 0;
        this.publish({ data, updatedAt: Date.now(), dataRequestedAt: now, error: null, retryAt: null });
      } catch (error) {
        if (controller.signal.aborted && controller.signal.reason?.name === "AbortError") return;
        this.failures += 1;
        const backoff = Math.min(300_000, 5_000 * 2 ** Math.min(this.failures - 1, 6));
        this.publish({
          error: error instanceof Error ? error.message : "Unable to refresh this reading.",
          retryAt: Date.now() + Math.max(backoff, Number.isFinite(retryAfterMs) ? Math.min(retryAfterMs, 3_600_000) : 0),
        });
      } finally {
        clearTimeout(timeout);
        this.request = null;
        this.controller = null;
        this.publish({ loading: false });
        this.schedule();
        // Strict Mode remounts and rapid hide/show can subscribe before abort settles.
        if (controller.signal.aborted && controller.signal.reason?.name === "AbortError" && this.listeners.size && this.visible()) {
          queueMicrotask(() => { if (this.listeners.size) void this.refresh(); });
        }
      }
    })();
    return this.request;
  };

  get active() { return this.listeners.size > 0 || this.request != null; }
}

const resources = new Map<string, JsonResource<unknown>>();
export function jsonResource<T>(url: string, options: ResourceOptions): JsonResource<T> {
  let resource = resources.get(url);
  if (!resource) {
    // Bound retained cache entries, never evict an active request or subscription.
    if (resources.size >= 100) {
      for (const [key, entry] of resources) {
        if (!entry.active) resources.delete(key);
        if (resources.size < 80) break;
      }
    }
    resource = new JsonResource<unknown>(url, options);
    resources.set(url, resource);
  }
  return resource as JsonResource<T>;
}
