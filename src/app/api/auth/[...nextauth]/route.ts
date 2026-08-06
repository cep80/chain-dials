import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limited = rateLimit(`auth:nextauth:${ip}`, 30, 15 * 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);
  return handlers.POST(req);
}
