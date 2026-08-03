"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatBtc, formatCompactUsd, formatRelativeAge } from "@/lib/format";
import type {
  HopsResponse,
  LookupResponse,
  WatchResponse,
  WatchedAddress,
} from "@/lib/forensics/types";

const POLL_MS = 60_000;
const NUDGE_KEY = "chain-dials:coldcard-watch-nudge:v1";
const SNAPSHOT_KEY = "chain-dials:coldcard-spent-snapshot:v1";

function satsToBtc(sats: number): number {
  return sats / 100_000_000;
}

function shortAddr(a: string): string {
  if (a.length <= 20) return a;
  return `${a.slice(0, 10)}…${a.slice(-8)}`;
}

function explorerAddress(a: string): string {
  return `https://mempool.space/address/${a}`;
}

function explorerTx(txid: string): string {
  return `https://mempool.space/tx/${txid}`;
}

function kindTone(kind: string): string {
  switch (kind) {
    case "tracked-vault":
    case "tracked-collector":
    case "tracked-holder":
      return "text-accent";
    case "known-victim":
      return "text-warn";
    case "op-return":
      return "text-paper-muted";
    default:
      return "text-paper";
  }
}

export function ColdcardForensics() {
  const [watch, setWatch] = useState<WatchResponse | null>(null);
  const [watchError, setWatchError] = useState<string | null>(null);
  const [loadingWatch, setLoadingWatch] = useState(true);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookup, setLookup] = useState<LookupResponse | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [hopAddress, setHopAddress] = useState("");
  const [hops, setHops] = useState<HopsResponse | null>(null);
  const [hopBusy, setHopBusy] = useState(false);
  const [hopError, setHopError] = useState<string | null>(null);
  const [nudgeOn, setNudgeOn] = useState(() => {
    try {
      return (
        typeof window !== "undefined" &&
        localStorage.getItem(NUDGE_KEY) === "1"
      );
    } catch {
      return false;
    }
  });
  const [nudgePerm, setNudgePerm] = useState<
    NotificationPermission | "unsupported"
  >(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return Notification.permission;
  });
  const lastNudgeAt = useRef(0);
  const spentSnapshot = useRef<Record<string, number>>(
    (() => {
      try {
        if (typeof window === "undefined") return {};
        return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) ?? "{}") as Record<
          string,
          number
        >;
      } catch {
        return {};
      }
    })(),
  );

  const refreshWatch = useCallback(async () => {
    try {
      const res = await fetch("/api/forensics/watch?limit=48", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`watch ${res.status}`);
      const data = (await res.json()) as WatchResponse;
      setWatch(data);
      setWatchError(null);
      return data;
    } catch (err) {
      setWatchError(err instanceof Error ? err.message : "watch failed");
      return null;
    } finally {
      setLoadingWatch(false);
    }
  }, []);

  useEffect(() => {
    const boot = window.setTimeout(() => {
      void refreshWatch();
    }, 0);
    const id = window.setInterval(() => {
      void refreshWatch();
    }, POLL_MS);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(id);
    };
  }, [refreshWatch]);

  useEffect(() => {
    if (!watch || !nudgeOn || nudgePerm !== "granted") return;

    const prev = spentSnapshot.current;
    const next: Record<string, number> = { ...prev };
    const freshMovers: WatchedAddress[] = [];

    for (const row of watch.watched) {
      if (!row.live) continue;
      const spent = row.live.spentSats;
      const before = prev[row.address];
      if (before != null && spent > before) {
        freshMovers.push(row);
      }
      next[row.address] = spent;
    }

    spentSnapshot.current = next;
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }

    if (
      freshMovers.length > 0 &&
      Date.now() - lastNudgeAt.current > 60_000
    ) {
      lastNudgeAt.current = Date.now();
      const first = freshMovers[0]!;
      new Notification("Coldcard drain address moved", {
        body: `${shortAddr(first.address)} spent coins. Open Trace to follow hops.`,
        tag: "coldcard-move",
      });
    }
  }, [watch, nudgeOn, nudgePerm]);

  const enableNudge = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNudgePerm(perm);
    if (perm === "granted") {
      setNudgeOn(true);
      try {
        localStorage.setItem(NUDGE_KEY, "1");
      } catch {
        // ignore
      }
    }
  };

  const disableNudge = () => {
    setNudgeOn(false);
    try {
      localStorage.setItem(NUDGE_KEY, "0");
    } catch {
      // ignore
    }
  };

  const runLookup = async (address?: string) => {
    const q = (address ?? lookupQuery).trim();
    if (!q) return;
    setLookupBusy(true);
    try {
      const res = await fetch(
        `/api/forensics/lookup?address=${encodeURIComponent(q)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as LookupResponse;
      setLookup(data);
      if (data.normalized) {
        setHopAddress(data.normalized);
      }
    } catch {
      setLookup(null);
    } finally {
      setLookupBusy(false);
    }
  };

  const runHops = async (address?: string) => {
    const q = (address ?? hopAddress).trim();
    if (!q) return;
    setHopBusy(true);
    setHopError(null);
    try {
      const res = await fetch(
        `/api/forensics/hops?address=${encodeURIComponent(q)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `hops ${res.status}`);
      }
      const data = (await res.json()) as HopsResponse;
      setHops(data);
      setHopAddress(data.address);
    } catch (err) {
      setHopError(err instanceof Error ? err.message : "trace failed");
      setHops(null);
    } finally {
      setHopBusy(false);
    }
  };

  const price = watch?.priceUsd ?? null;
  const liveBtc = watch ? satsToBtc(watch.totalLiveBalanceSats) : null;
  const curatedBtc = watch
    ? satsToBtc(watch.summary.totalSweptSats)
    : null;

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-accent">
          Bitcoin only · public chain data
        </p>
        <h1 className="text-3xl font-extrabold text-paper md:text-4xl">
          Coldcard drain watch
        </h1>
        <p className="max-w-3xl text-paper-muted">
          Track known collector and vault addresses from the July–August 2026
          Coldcard RNG sweeps, check whether an address appears in the published
          victim set, and follow the first hops when stolen coins move. Floor
          counts from public reconstructions (Galaxy Research, Kelbie
          postmortem). Not legal advice; useful for victims and investigators.
        </p>
        {watch ? (
          <p className="text-xs text-paper-muted">
            Curated floor: {formatBtc(curatedBtc, 2)} across{" "}
            {watch.summary.victimAddressCount.toLocaleString()} addresses ·{" "}
            {watch.summary.waveCount} waves · dataset{" "}
            {new Date(watch.summary.generatedAt).toLocaleString()} · live watch
            refreshed {formatRelativeAge(watch.fetchedAt)}
          </p>
        ) : null}
      </header>

      <section className="rounded-[14px] border border-line bg-ink-elevated p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-paper">Watchboard</h2>
            <p className="mt-1 text-sm text-paper-muted">
              Live balances for seed holdings plus the largest remaining
              tracked vaults/collectors. Polls every 60s.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {nudgePerm === "unsupported" ? (
              <span className="text-xs text-paper-muted">
                Browser nudges unavailable
              </span>
            ) : nudgeOn ? (
              <button
                type="button"
                onClick={disableNudge}
                className="rounded-[10px] border border-line px-3 py-2 text-xs text-paper-muted hover:text-paper"
              >
                Disable move nudges
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void enableNudge()}
                className="rounded-[10px] border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/20"
              >
                Nudge me when coins move
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setLoadingWatch(true);
                void refreshWatch();
              }}
              className="rounded-[10px] border border-line px-3 py-2 text-xs text-paper-muted hover:text-paper"
            >
              Refresh now
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Watched live"
            value={
              liveBtc == null
                ? "…"
                : `${formatBtc(liveBtc, 2)}${price != null ? ` · ${formatCompactUsd(liveBtc * price)}` : ""}`
            }
          />
          <Stat
            label="Movers vs dataset"
            value={
              watch
                ? `${watch.movers.length} address${watch.movers.length === 1 ? "" : "es"}`
                : "…"
            }
          />
          <Stat
            label="Addresses polled"
            value={watch ? String(watch.watched.length) : "…"}
          />
        </div>

        {watchError ? (
          <p className="mt-4 text-sm text-down">{watchError}</p>
        ) : null}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.16em] text-paper-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-medium">Address</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Live bal</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Trace</th>
              </tr>
            </thead>
            <tbody>
              {loadingWatch && !watch ? (
                <tr>
                  <td colSpan={5} className="py-6 text-paper-muted">
                    Loading live balances…
                  </td>
                </tr>
              ) : null}
              {watch?.watched.map((row) => {
                const bal = row.live ? satsToBtc(row.live.balanceSats) : null;
                return (
                  <tr
                    key={row.address}
                    className="border-b border-line/70 align-top"
                  >
                    <td className="py-3 pr-3">
                      <a
                        href={explorerAddress(row.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="mono text-xs text-paper hover:text-accent"
                      >
                        {shortAddr(row.address)}
                      </a>
                      <div className="mt-1 text-[11px] text-paper-muted">
                        {row.label}
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-xs text-paper-muted">
                      {row.role} · wave {row.wave}
                    </td>
                    <td className="mono py-3 pr-3 text-xs text-paper">
                      {bal == null ? "…" : formatBtc(bal, 4)}
                      {bal != null && price != null ? (
                        <div className="text-paper-muted">
                          {formatCompactUsd(bal * price)}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 text-xs">
                      {row.error ? (
                        <span className="text-down">error</span>
                      ) : row.moved ? (
                        <span className="font-semibold text-warn">moved</span>
                      ) : bal === 0 ? (
                        <span className="text-paper-muted">empty</span>
                      ) : (
                        <span className="text-up">parked</span>
                      )}
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        className="text-xs text-accent hover:underline"
                        onClick={() => {
                          setHopAddress(row.address);
                          void runHops(row.address);
                          document
                            .getElementById("hop-tracer")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        Hops
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[14px] border border-line bg-ink-elevated p-5 md:p-6">
        <h2 className="text-xl font-bold text-paper">Victim lookup</h2>
        <p className="mt-1 text-sm text-paper-muted">
          Paste a Bitcoin address. We check the published drained set and
          tracked attacker holders. Never paste a seed phrase.
        </p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void runLookup();
          }}
        >
          <input
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
            placeholder="bc1q… or 1… / 3…"
            spellCheck={false}
            autoComplete="off"
            className="mono min-h-11 flex-1 rounded-[10px] border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={lookupBusy}
            className="min-h-11 rounded-[10px] bg-accent px-4 text-sm font-bold text-ink disabled:opacity-60"
          >
            {lookupBusy ? "Checking…" : "Look up"}
          </button>
        </form>

        {lookup ? (
          <div className="mt-4 rounded-[12px] border border-line bg-ink p-4 text-sm">
            {!lookup.valid ? (
              <p className="text-down">That does not look like a Bitcoin address.</p>
            ) : lookup.hit?.kind === "victim" || lookup.hit?.kind === "both" ? (
              <div className="space-y-2">
                <p className="font-semibold text-warn">
                  Match: published drained victim address
                </p>
                <p className="mono text-xs text-paper">{lookup.normalized}</p>
                {lookup.hit.victim ? (
                  <p className="text-paper-muted">
                    Wave {lookup.hit.victim.wave} · swept{" "}
                    {formatBtc(satsToBtc(lookup.hit.victim.valueSats), 4)} ·{" "}
                    {new Date(lookup.hit.victim.sweptAt * 1000).toUTCString()}
                  </p>
                ) : null}
                {lookup.hit.holder ? (
                  <p className="text-accent">
                    Also labeled as attacker-side: {lookup.hit.holder.label}
                  </p>
                ) : null}
              </div>
            ) : lookup.hit?.kind === "holder" ? (
              <div className="space-y-2">
                <p className="font-semibold text-accent">
                  Match: tracked attacker holder
                </p>
                <p className="mono text-xs text-paper">{lookup.normalized}</p>
                <p className="text-paper-muted">{lookup.hit.holder?.label}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-semibold text-paper">
                  Not in the published drain set
                </p>
                <p className="text-paper-muted">
                  Absence is not safety. The public lists are floors; other
                  clusters exist. If this was a Coldcard single-sig seed from
                  affected firmware, migrate anyway.
                </p>
              </div>
            )}
            {lookup.hit?.live ? (
              <p className="mt-3 text-xs text-paper-muted">
                Live balance:{" "}
                {formatBtc(satsToBtc(lookup.hit.live.balanceSats), 6)} ·{" "}
                {lookup.hit.live.txCount} txs
              </p>
            ) : null}
            {lookup.normalized ? (
              <button
                type="button"
                className="mt-3 text-xs text-accent hover:underline"
                onClick={() => {
                  void runHops(lookup.normalized!);
                  document
                    .getElementById("hop-tracer")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Trace hops from this address
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <section
        id="hop-tracer"
        className="rounded-[14px] border border-line bg-ink-elevated p-5 md:p-6"
      >
        <h2 className="text-xl font-bold text-paper">Hop tracer</h2>
        <p className="mt-1 text-sm text-paper-muted">
          When a vault or collector spends, list destinations and label known
          Coldcard-cluster addresses. External outputs stay unlabeled unless we
          have a curated entity name. First spend from P2WSH vaults can reveal
          scripts for investigators.
        </p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void runHops();
          }}
        >
          <input
            value={hopAddress}
            onChange={(e) => setHopAddress(e.target.value)}
            placeholder="Address to follow"
            spellCheck={false}
            autoComplete="off"
            className="mono min-h-11 flex-1 rounded-[10px] border border-line bg-ink px-3 text-sm text-paper outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={hopBusy}
            className="min-h-11 rounded-[10px] bg-accent px-4 text-sm font-bold text-ink disabled:opacity-60"
          >
            {hopBusy ? "Tracing…" : "Trace spends"}
          </button>
        </form>

        {hopError ? <p className="mt-3 text-sm text-down">{hopError}</p> : null}

        {hops ? (
          <div className="mt-5 space-y-4">
            <div className="text-sm text-paper-muted">
              <span className="text-paper">{shortAddr(hops.address)}</span>
              {" · "}
              {hops.role}
              {hops.live
                ? ` · live ${formatBtc(satsToBtc(hops.live.balanceSats), 4)}`
                : ""}
              {" · "}
              {hops.spends.length} recent spend
              {hops.spends.length === 1 ? "" : "s"}
            </div>

            {hops.spends.length === 0 ? (
              <p className="text-sm text-paper-muted">
                No outbound spends in the recent tx window. Coins may still be
                parked.
              </p>
            ) : (
              hops.spends.map((spend) => (
                <div
                  key={spend.txid}
                  className="rounded-[12px] border border-line bg-ink p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <a
                      href={explorerTx(spend.txid)}
                      target="_blank"
                      rel="noreferrer"
                      className="mono text-accent hover:underline"
                    >
                      {spend.txid.slice(0, 18)}…
                    </a>
                    <span className="text-paper-muted">
                      {spend.confirmed
                        ? `block ${spend.blockHeight ?? "?"}`
                        : "unconfirmed"}
                      {spend.blockTime
                        ? ` · ${new Date(spend.blockTime * 1000).toUTCString()}`
                        : ""}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {spend.destinations.map((d, i) => (
                      <li
                        key={`${spend.txid}-${i}`}
                        className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                      >
                        <div>
                          {d.address ? (
                            <a
                              href={explorerAddress(d.address)}
                              target="_blank"
                              rel="noreferrer"
                              className="mono text-xs text-paper hover:text-accent"
                            >
                              {shortAddr(d.address)}
                            </a>
                          ) : (
                            <span className="text-xs text-paper-muted">
                              (no address)
                            </span>
                          )}
                          <div className={`text-xs ${kindTone(d.kind)}`}>
                            {d.label}
                          </div>
                        </div>
                        <span className="mono text-xs text-paper">
                          {formatBtc(satsToBtc(d.valueSats), 6)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {spend.destinations.some((d) => d.kind === "external" && d.address) ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {spend.destinations
                        .filter((d) => d.kind === "external" && d.address)
                        .slice(0, 3)
                        .map((d) => (
                          <button
                            key={d.address!}
                            type="button"
                            className="text-[11px] text-accent hover:underline"
                            onClick={() => {
                              setHopAddress(d.address!);
                              void runHops(d.address!);
                            }}
                          >
                            Follow {shortAddr(d.address!)}
                          </button>
                        ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        ) : null}
      </section>

      <aside className="rounded-[14px] border border-dashed border-line/80 p-5 text-sm text-paper-muted">
        <p className="font-semibold text-paper">For victims and investigators</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Report theft to local cybercrime units and the FBI{" "}
            <a
              className="text-accent hover:underline"
              href="https://www.ic3.gov/"
              target="_blank"
              rel="noreferrer"
            >
              IC3
            </a>
            ; include txids and destination addresses.
          </li>
          <li>
            Share leads with Galaxy Research (
            <span className="text-paper">@intangiblecoins</span>) who already
            flagged ~600 suspect addresses to federal and compliance partners.
          </li>
          <li>
            Coinkite advisory: update firmware, generate a new seed, migrate.
            Firmware updates do not repair an old seed.
          </li>
          <li>
            Never enter a seed phrase or passphrase into any website, including
            this one.
          </li>
        </ul>
        <p className="mt-3 text-xs">
          Live data via mempool.space. Curated set from{" "}
          <a
            className="text-accent hover:underline"
            href="https://github.com/Kelbie/coldcard-rng-postmortem"
            target="_blank"
            rel="noreferrer"
          >
            coldcard-rng-postmortem
          </a>{" "}
          and Galaxy public threads. Also see{" "}
          <a
            className="text-accent hover:underline"
            href="https://coldcard-watch.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            Coldcard Sweep Watch
          </a>
          .
        </p>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-line bg-ink px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-paper-muted">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-paper">{value}</div>
    </div>
  );
}
