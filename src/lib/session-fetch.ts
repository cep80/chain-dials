"use client";

import { getSession } from "next-auth/react";

/**
 * fetch for signed-in API routes. When the server reports the Supabase token
 * behind the session has expired (a tab left open past its lifetime), ask
 * Auth.js for the session, which refreshes and re-sets the cookie, then retry
 * once.
 */
export async function sessionFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 401) return res;
  const body = (await res.clone().json().catch(() => null)) as { code?: string } | null;
  if (body?.code !== "session_expired") return res;
  const session = await getSession();
  if (!session) return res;
  return fetch(input, init);
}
