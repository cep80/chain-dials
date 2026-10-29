import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      pro: boolean;
      proStatus: string;
      proCurrentPeriodEnd: string | null;
    };
  }

  interface User {
    proStatus?: string;
    /** Supabase tokens, carried from authorize() into the JWT. */
    sbAccess?: string;
    sbRefresh?: string;
    sbExpiresAt?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    pro?: boolean;
    proStatus?: string;
    proCurrentPeriodEnd?: string | null;
    proCheckedAt?: number;
    /**
     * The Supabase access token this session acts with. API routes use it so
     * PostgREST applies row-level security as the signed-in user.
     */
    sbAccess?: string;
    sbRefresh?: string;
    sbExpiresAt?: number;
  }
}
