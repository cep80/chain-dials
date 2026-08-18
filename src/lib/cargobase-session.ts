import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isProActive } from "@/lib/pro";

/**
 * The signed-in user's CargoBase credentials, for API routes.
 *
 * Read from the NextAuth JWT rather than from `auth()`: the session object is
 * serialised to the browser, and the CargoBase access token must not be.
 */
export type CargoUser = {
  id: string;
  token: string;
  pro: boolean;
};

async function readToken(req: Request) {
  return getToken({
    // getToken only needs the cookies off the request.
    req: req as unknown as Parameters<typeof getToken>[0]["req"],
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });
}

/** Signed-in user, or a 401 response. */
export async function requireCargoUser(
  req: Request,
): Promise<{ user: CargoUser } | { error: NextResponse }> {
  const token = await readToken(req);
  if (!token?.sub || !token.cbAccess) {
    return {
      error: NextResponse.json({ error: "Sign in required" }, { status: 401 }),
    };
  }
  return {
    user: {
      id: token.sub,
      token: token.cbAccess,
      pro: isProActive(token.proStatus, token.proCurrentPeriodEnd),
    },
  };
}

/** Signed-in Pro user, or a 401/403 response. */
export async function requireProUser(
  req: Request,
  feature: string,
): Promise<{ user: CargoUser } | { error: NextResponse }> {
  const gate = await requireCargoUser(req);
  if ("error" in gate) return gate;
  if (!gate.user.pro) {
    return {
      error: NextResponse.json(
        { error: `Pro subscription required for ${feature}.` },
        { status: 403 },
      ),
    };
  }
  return gate;
}
