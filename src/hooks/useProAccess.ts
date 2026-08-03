"use client";

import { useSession } from "next-auth/react";
import { isProEnabled } from "@/lib/pro";

/** Client hook: Pro from session, or force flag for demos. */
export function useProAccess() {
  const { data, status } = useSession();
  const loading = status === "loading";
  const signedIn = status === "authenticated" && !!data?.user;
  const pro = isProEnabled() || Boolean(data?.user?.pro);
  return {
    loading,
    signedIn,
    pro,
    user: data?.user ?? null,
    status,
  };
}
