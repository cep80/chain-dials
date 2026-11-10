/**
 * Supabase client, over plain fetch: the app only needs a handful of auth
 * calls and PostgREST, all server-side.
 *
 * Two ways in:
 *
 * - `sbRest` with a user's access token, subject to row-level security: a user
 *   can only ever read or write their own rows, enforced by the database.
 * - `sbAdmin` with the secret key, which bypasses RLS. Only for work with no
 *   user in scope, such as the Stripe webhook and account deletion.
 *
 * NextAuth stays the session layer; the Supabase tokens ride in its JWT.
 */

const BASE = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";

export function supabaseConfigured(): boolean {
  return Boolean(BASE && PUBLISHABLE);
}

function requireConfig() {
  if (!supabaseConfigured()) {
    throw new Error(
      "Supabase is not configured: set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY",
    );
  }
}

function requireSecret(): string {
  if (!SECRET) throw new Error("Supabase admin call without SUPABASE_SECRET_KEY");
  return SECRET;
}

/**
 * Headers for a key used on its own. A legacy service_role key is a JWT and
 * goes in Authorization too; an sb_secret_ key is not a JWT and must only be
 * sent as apikey, or the gateway rejects it.
 */
function keyHeaders(key: string): Record<string, string> {
  return key.startsWith("eyJ")
    ? { apikey: key, Authorization: `Bearer ${key}` }
    : { apikey: key };
}

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email: string };
};

export class SupabaseError extends Error {
  status: number;
  code: string | null;
  constructor(status: number, message: string, code: string | null = null) {
    super(message);
    this.name = "SupabaseError";
    this.status = status;
    this.code = code;
  }
}

async function toError(res: Response): Promise<SupabaseError> {
  try {
    const body = await res.json();
    // Auth answers {error_code, msg}; PostgREST answers {code, message}.
    const message = body?.msg || body?.message || body?.error_description || body?.error || res.statusText;
    return new SupabaseError(res.status, message, body?.error_code ?? body?.code ?? null);
  } catch {
    return new SupabaseError(res.status, res.statusText);
  }
}

/** Liveness of the auth service, for /api/health. */
export async function supabaseHealthy(): Promise<boolean> {
  if (!supabaseConfigured()) return false;
  try {
    const res = await fetch(`${BASE}/auth/v1/health`, {
      headers: { apikey: PUBLISHABLE },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function authPost(path: string, body: unknown): Promise<Response> {
  requireConfig();
  return fetch(`${BASE}/auth/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: PUBLISHABLE },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

/** Sign in. Returns null on bad credentials so callers can treat it as a miss. */
export async function sbLogin(
  email: string,
  password: string,
): Promise<SupabaseSession | null> {
  const res = await authPost("token?grant_type=password", { email, password });
  // Supabase answers 400 (invalid_credentials) for a wrong password or an
  // unknown address alike.
  if (res.status === 400) return null;
  if (!res.ok) throw await toError(res);
  return (await res.json()) as SupabaseSession;
}

/**
 * Create an account. A taken address throws SupabaseError with code
 * "user_already_exists" (422). Email confirmation is off, so a session comes
 * back straight away.
 */
export async function sbSignup(
  email: string,
  password: string,
): Promise<SupabaseSession> {
  const res = await authPost("signup", { email, password });
  if (!res.ok) throw await toError(res);
  return (await res.json()) as SupabaseSession;
}

/**
 * Exchange a refresh token. Access tokens last an hour; sessions last longer.
 * Returns null only when Supabase refuses the token itself (400); a 429 or 5xx
 * throws, because the token may still be good.
 */
export async function sbRefresh(
  refreshToken: string,
): Promise<SupabaseSession | null> {
  const res = await authPost("token?grant_type=refresh_token", {
    refresh_token: refreshToken,
  });
  if (res.status === 400) return null;
  if (!res.ok) throw await toError(res);
  return (await res.json()) as SupabaseSession;
}

/**
 * Email a password-reset link that lands on `redirectTo` with a recovery
 * access token in the URL fragment. Supabase answers the same whether or not
 * the address has an account.
 */
export async function sbRecover(email: string, redirectTo: string): Promise<void> {
  const res = await authPost(`recover?redirect_to=${encodeURIComponent(redirectTo)}`, { email });
  if (!res.ok) throw await toError(res);
}

/** Set a new password with an access token (here, the recovery link's). */
export async function sbUpdatePassword(accessToken: string, password: string): Promise<void> {
  requireConfig();
  const res = await fetch(`${BASE}/auth/v1/user`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      apikey: PUBLISHABLE,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ password }),
    cache: "no-store",
  });
  if (!res.ok) throw await toError(res);
}

/**
 * End every session the user has, including the one this token belongs to.
 * Supabase checks the session behind each access token, so the token stops
 * working at once, and refresh tokens die with it.
 */
export async function sbSignOutEverywhere(accessToken: string): Promise<void> {
  requireConfig();
  const res = await fetch(`${BASE}/auth/v1/logout?scope=global`, {
    method: "POST",
    headers: { apikey: PUBLISHABLE, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw await toError(res);
}

/**
 * Delete a user. Every app table references auth.users with ON DELETE
 * CASCADE, so this removes all of their rows too.
 */
export async function sbDeleteUser(userId: string): Promise<void> {
  requireConfig();
  const res = await fetch(`${BASE}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: keyHeaders(requireSecret()),
    cache: "no-store",
  });
  if (!res.ok) throw await toError(res);
}

type RestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Ask PostgREST to return the affected rows. */
  representation?: boolean;
  /** POST as an upsert, merging on the conflict target named in `on_conflict`. */
  upsert?: boolean;
  token: string;
};

async function rest<T>(
  path: string,
  auth: Record<string, string>,
  opts: Omit<RestOptions, "token">,
): Promise<T> {
  requireConfig();
  const headers: Record<string, string> = { ...auth, Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const prefer = [
    opts.representation ? "return=representation" : "",
    opts.upsert ? "resolution=merge-duplicates" : "",
  ].filter(Boolean);
  if (prefer.length) headers["Prefer"] = prefer.join(",");

  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
  });
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** One PostgREST call as the user. `path` starts with the table, e.g. `layouts?select=*`. */
/**
 * PostgREST filter matching every row except `keep` (by id), or every row when
 * `keep` is empty. Used to drop the old set after inserting a replacement.
 */
export function notIn(keep: { id: string }[]): string {
  if (keep.length === 0) return "id=not.is.null";
  const ids = keep.map((row) => `"${String(row.id).replace(/"/g, "")}"`).join(",");
  return `id=not.in.(${encodeURIComponent(ids)})`;
}

export async function sbRest<T>(path: string, opts: RestOptions): Promise<T> {
  const { token, ...rest_ } = opts;
  return rest<T>(path, { apikey: PUBLISHABLE, Authorization: `Bearer ${token}` }, rest_);
}

/**
 * PostgREST with the secret key. Bypasses RLS, so every call must scope itself
 * by user_id explicitly — the database will not do it for you here.
 */
export async function sbAdmin<T>(
  path: string,
  opts: Omit<RestOptions, "token">,
): Promise<T> {
  return rest<T>(path, keyHeaders(requireSecret()), opts);
}
