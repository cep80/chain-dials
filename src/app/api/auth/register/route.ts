import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(80).optional(),
});

const GENERIC_OK = {
  ok: true as const,
  message: "If this email is free, your account is ready. You can sign in.",
};

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = rateLimit(`auth:register:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Need a valid email and a password of at least 8 characters." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Same shape as success so callers cannot enumerate accounts.
    return NextResponse.json(GENERIC_OK, { status: 201 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name ?? email.split("@")[0],
      passwordHash,
    },
    select: { id: true },
  });

  return NextResponse.json(GENERIC_OK, { status: 201 });
}
