import { effectivePro, isProActive, type EntitlementColumns } from "@/lib/pro";

/** Free accounts get one watch so they feel a notification arrive. */
export const FREE_WATCH_LIMIT = 1;
export const PRO_WATCH_LIMIT = 25;

export function watchLimit(pro: boolean): number {
  return pro ? PRO_WATCH_LIMIT : FREE_WATCH_LIMIT;
}

export type EntitlementProfile = EntitlementColumns & { user_id: string };

/**
 * The watches the engine should evaluate: each user's oldest N, where N is
 * their allowance today. A lapsed Pro user keeps their first watch working
 * and the rest pause rather than being deleted.
 */
export function entitledWatches<W extends { user_id: string; created_at: string }>(
  watches: W[],
  profiles: EntitlementProfile[],
): W[] {
  const pro = new Map(
    profiles.map((p) => {
      const e = effectivePro(p);
      return [p.user_id, isProActive(e.status, e.periodEnd)];
    }),
  );
  const sorted = [...watches].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const used = new Map<string, number>();
  return sorted.filter((w) => {
    const n = used.get(w.user_id) ?? 0;
    if (n >= watchLimit(pro.get(w.user_id) ?? false)) return false;
    used.set(w.user_id, n + 1);
    return true;
  });
}
