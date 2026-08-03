import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isProActive } from "@/lib/pro";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.sub = user.id;
      }
      if (token.sub && (user || trigger === "update" || !token.proCheckedAt || Date.now() - (token.proCheckedAt as number) > 60_000)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            proStatus: true,
            proCurrentPeriodEnd: true,
            stripeCustomerId: true,
            name: true,
            email: true,
          },
        });
        if (dbUser) {
          token.proStatus = dbUser.proStatus;
          token.proCurrentPeriodEnd = dbUser.proCurrentPeriodEnd?.toISOString() ?? null;
          token.stripeCustomerId = dbUser.stripeCustomerId;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.pro = isProActive(dbUser.proStatus, dbUser.proCurrentPeriodEnd);
          token.proCheckedAt = Date.now();
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.pro = Boolean(token.pro);
        session.user.proStatus = (token.proStatus as string) ?? "none";
        session.user.proCurrentPeriodEnd =
          (token.proCurrentPeriodEnd as string | null) ?? null;
        session.user.stripeCustomerId =
          (token.stripeCustomerId as string | null) ?? null;
      }
      return session;
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
});
