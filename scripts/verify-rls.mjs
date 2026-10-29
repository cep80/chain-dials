#!/usr/bin/env node
/**
 * Checks that the CargoBase database refuses what the app relies on it to refuse.
 *
 *   node --env-file=.env.local scripts/verify-rls.mjs
 *
 * Always: anonymous callers read nothing from any table.
 * With VERIFY_EMAIL / VERIFY_PASSWORD (any non-Pro account): that user cannot
 * write their own profile, i.e. cannot grant themselves Pro.
 *
 * Nothing here changes data. The update probe writes back the value already
 * stored, and the insert probe sends a NULL pro_status: Postgres checks grants
 * and RLS before NOT NULL, so a not-null error means the write was permitted
 * and only the bad value stopped it.
 */

const BASE = (process.env.CARGOBASE_URL ?? "").replace(/\/+$/, "");
const ANON = process.env.CARGOBASE_ANON_KEY ?? "";
const TABLES = ["profiles", "layouts", "alert_rules", "wall_packs", "desk_packs"];

if (!BASE || !ANON) {
  console.error("Set CARGOBASE_URL and CARGOBASE_ANON_KEY (e.g. --env-file=.env.local).");
  process.exit(2);
}

let failed = 0;
const pass = (msg) => console.log(`  ok    ${msg}`);
const fail = (msg) => {
  failed++;
  console.log(`  FAIL  ${msg}`);
};

async function rest(path, { method = "GET", token, body } = {}) {
  const headers = { apikey: ANON, Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers.Prefer = "return=representation";
  }
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

console.log("anonymous");
for (const t of TABLES) {
  const { status, json } = await rest(`${t}?select=*&limit=1`);
  if (status >= 400 || (Array.isArray(json) && json.length === 0)) {
    pass(`${t}: no rows (${status})`);
  } else {
    fail(`${t}: anonymous read returned data (${status})`);
  }
}

const email = process.env.VERIFY_EMAIL;
const password = process.env.VERIFY_PASSWORD;
if (!email || !password) {
  console.log("\naccount probes skipped: set VERIFY_EMAIL and VERIFY_PASSWORD");
} else {
  console.log(`\naccount ${email}`);
  const login = await fetch(`${BASE}/auth/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) {
    console.error(`  login failed (${login.status})`);
    process.exit(2);
  }
  const { access_token: token, user } = await login.json();
  const mine = `profiles?user_id=eq.${encodeURIComponent(user.id)}`;

  const own = await rest(`${mine}&select=pro_status`, { token });
  const current = Array.isArray(own.json) ? own.json[0] : undefined;
  if (current) pass(`reads own profile (pro_status=${current.pro_status})`);
  else console.log("  note  no profile row for this account; update probe has nothing to target");

  if (current) {
    const upd = await rest(mine, {
      method: "PATCH",
      token,
      body: { pro_status: current.pro_status },
    });
    if (upd.status < 400 && Array.isArray(upd.json) && upd.json.length > 0) {
      fail("user can UPDATE own profile, so can set pro_status=active (run db/migrations/001)");
    } else {
      pass(`profile update refused (${upd.status}${upd.json?.code ? ` ${upd.json.code}` : ""})`);
    }
  }

  const ins = await rest("profiles", {
    method: "POST",
    token,
    body: { user_id: user.id, pro_status: null },
  });
  if (ins.json?.code === "23502") {
    fail("user can INSERT a profile, so can create one with pro_status=active (run db/migrations/001)");
  } else if (ins.status < 400) {
    fail(`profile insert unexpectedly succeeded (${ins.status}); inspect and delete the row`);
  } else {
    pass(`profile insert refused (${ins.status}${ins.json?.code ? ` ${ins.json.code}` : ""})`);
  }
}

console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
