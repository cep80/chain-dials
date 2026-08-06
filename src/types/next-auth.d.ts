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
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    pro?: boolean;
    proStatus?: string;
    proCurrentPeriodEnd?: string | null;
    proCheckedAt?: number;
  }
}
