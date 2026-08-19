import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { cbLogin, cbRefresh, cbRest } from "@/lib/cargobase";
import { isProActive } from "@/lib/pro";
import { rateLimit } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

type ProfileRow = {
  pro_status: string | null;
  pro_current_period_end: string | null;
};

/** Refresh the access token a minute before it lapses, not after. */
const REFRESH_SKEW_MS = 60_000;
const PRO_RECHECK_MS = 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/account/signin",
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase().trim();
        // CargoBase throttles this too; keeping a local limit avoids spending
        // that budget (and the round trip) on an obvious flood.
        const limited = rateLimit(`auth:cred:${email}`, 10, 15 * 60 * 1000);
        if (!limited.ok) return null;

        const session = await cbLogin(email, parsed.data.password);
        if (!session) return null;

        return {
          id: session.user.id,
          email: session.user.email,
          cbAccess: session.access_token,
          cbRefresh: session.refresh_token,
          cbExpiresAt: Date.now() + session.expires_in * 1000,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.sub = user.id;
        token.email = user.email ?? token.email;
        token.cbAccess = user.cbAccess;
        token.cbRefresh = user.cbRefresh;
        token.cbExpiresAt = user.cbExpiresAt;
      }

      // Access tokens last an hour; a signed-in session outlives that, so trade
      // the refresh token in before the next API call needs it.
      if (
        token.cbRefresh &&
        (!token.cbExpiresAt || Date.now() > token.cbExpiresAt - REFRESH_SKEW_MS)
      ) {
        const next = await cbRefresh(token.cbRefresh);
        if (next) {
          token.cbAccess = next.access_token;
          token.cbRefresh = next.refresh_token;
          token.cbExpiresAt = Date.now() + next.expires_in * 1000;
        } else {
          // The refresh token was revoked or replayed. Drop the credentials so
          // the session stops acting as a user it can no longer prove it is.
          delete token.cbAccess;
          delete token.cbRefresh;
          delete token.cbExpiresAt;
        }
      }

      const stale =
        !token.proCheckedAt || Date.now() - token.proCheckedAt > PRO_RECHECK_MS;
      if (token.cbAccess && (user || trigger === "update" || stale)) {
        try {
          const rows = await cbRest<ProfileRow[]>(
            "profiles?select=pro_status,pro_current_period_end&limit=1",
            { token: token.cbAccess },
          );
          const profile = rows?.[0];
          token.proStatus = profile?.pro_status ?? "none";
          token.proCurrentPeriodEnd = profile?.pro_current_period_end ?? null;
          token.pro = isProActive(token.proStatus, token.proCurrentPeriodEnd);
          token.proCheckedAt = Date.now();
        } catch {
          // A profile read failure must not sign the user out; leave the last
          // known entitlement in place and try again on the next pass.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.pro = Boolean(token.pro);
        session.user.proStatus = token.proStatus ?? "none";
        session.user.proCurrentPeriodEnd = token.proCurrentPeriodEnd ?? null;
      }
      return session;
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
});
