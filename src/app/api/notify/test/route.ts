import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase-session";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { deliver } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** Send a test message to every place this account is linked. */
export async function POST(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const limited = rateLimit(`notify:test:${gate.user.id}`, 5, 10 * 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);
  const outcome = await deliver(gate.user.id, {
    title: "Chain Dials test",
    body: "Notifications are working. Your watches will arrive like this.",
    path: "/btc/watch",
  });
  return NextResponse.json(outcome);
}
