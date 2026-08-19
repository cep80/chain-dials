/**
 * CargoBase client.
 *
 * Replaces Prisma as the persistence layer. Two ways in:
 *
 * - `cbRest` with a user's access token, which goes through PostgREST and is
 *   therefore subject to row-level security — a user can only ever read or
 *   write their own rows, enforced by the database rather than by us.
 * - `cbAdmin` with the service role key, which bypasses RLS. Only for work
 *   that has no user in scope, such as the Stripe webhook.
 */

const BASE = (process.env.CARGOBASE_URL ?? "").replace(/\/+$/, "");
const ANON = process.env.CARGOBASE_ANON_KEY ?? "";
const SERVICE = process.env.CARGOBASE_SERVICE_ROLE_KEY ?? "";

/** Health probe target. Kept here so the origin is not re-derived elsewhere. */
export function getApiHealthUrl(): string {
  return `${BASE}/auth/health`;
}

export function cargobaseConfigured(): boolean {
  return Boolean(BASE && ANON);
}

function requireConfig() {
  if (!BASE || !ANON) {
    throw new Error(
      "CargoBase is not configured: set CARGOBASE_URL and CARGOBASE_ANON_KEY",
    );
  }
}

export type CargoSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email: string };
};

export class CargoError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "CargoError";
    this.status = status;
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error || body?.message || res.statusText;
  } catch {
    return res.statusText;
  }
}

/** Sign in. Returns null on bad credentials so callers can treat it as a miss. */
export async function cbLogin(
  email: string,
  password: string,
): Promise<CargoSession | null> {
  requireConfig();
  const res = await fetch(`${BASE}/auth/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new CargoError(res.status, await readError(res));
  return (await res.json()) as CargoSession;
}

export async function cbSignup(
  email: string,
  password: string,
): Promise<CargoSession> {
  requireConfig();
  const res = await fetch(`${BASE}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!res.ok) throw new CargoError(res.status, await readError(res));
  return (await res.json()) as CargoSession;
}

/** Exchange a refresh token. Access tokens last an hour; sessions last longer. */
export async function cbRefresh(
  refreshToken: string,
): Promise<CargoSession | null> {
  requireConfig();
  const res = await fetch(`${BASE}/auth/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "refresh_token", refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as CargoSession;
}

type RestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Ask PostgREST to return the affected rows. */
  representation?: boolean;
  token: string;
};

/** One PostgREST call. `path` starts with the table, e.g. `layouts?select=*`. */
export async function cbRest<T>(path: string, opts: RestOptions): Promise<T> {
  requireConfig();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.token}`,
    apikey: ANON,
    Accept: "application/json",
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.representation) headers["Prefer"] = "return=representation";

  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
  });
  if (!res.ok) throw new CargoError(res.status, await readError(res));
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/**
 * PostgREST as service_role. Bypasses RLS, so every call must scope itself by
 * user_id explicitly — the database will not do it for you here.
 */
export async function cbAdmin<T>(
  path: string,
  opts: Omit<RestOptions, "token">,
): Promise<T> {
  if (!SERVICE) {
    throw new Error(
      "CargoBase admin call without CARGOBASE_SERVICE_ROLE_KEY",
    );
  }
  return cbRest<T>(path, { ...opts, token: SERVICE });
}
