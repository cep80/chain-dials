import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { ALERT_KINDS } from "@/lib/alerts/kinds";
import { prisma } from "@/lib/db";
import { isProActive } from "@/lib/pro";

export const dynamic = "force-dynamic";

const ruleSchema = z.object({
  id: z.string().optional(),
  chainId: z.enum(["btc", "eth", "sol", "hype"]),
  kind: z.enum(ALERT_KINDS),
  enabled: z.boolean().default(true),
  params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).default({}),
});

async function requireProUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !isProActive(user.proStatus, user.proCurrentPeriodEnd)) {
    return {
      error: NextResponse.json(
        { error: "Pro subscription required for alert rules." },
        { status: 403 },
      ),
    };
  }
  return { user };
}

export async function GET(req: Request) {
  const gate = await requireProUser();
  if ("error" in gate && gate.error) return gate.error;
  const user = gate.user!;

  const url = new URL(req.url);
  const chainId = url.searchParams.get("chainId") ?? undefined;

  const rules = await prisma.alertRule.findMany({
    where: {
      userId: user.id,
      ...(chainId ? { chainId } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    rules: rules.map((r) => ({
      id: r.id,
      chainId: r.chainId,
      kind: r.kind,
      enabled: r.enabled,
      params: JSON.parse(r.params) as Record<string, unknown>,
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}

export async function PUT(req: Request) {
  const gate = await requireProUser();
  if ("error" in gate && gate.error) return gate.error;
  const user = gate.user!;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = z.object({ rules: z.array(ruleSchema).max(12) }).safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid rules payload" }, { status: 400 });
  }

  const chainIds = [...new Set(parsed.data.rules.map((r) => r.chainId))];
  await prisma.$transaction(async (tx) => {
    for (const chainId of chainIds) {
      await tx.alertRule.deleteMany({ where: { userId: user.id, chainId } });
    }
    for (const rule of parsed.data.rules) {
      await tx.alertRule.create({
        data: {
          userId: user.id,
          chainId: rule.chainId,
          kind: rule.kind,
          enabled: rule.enabled,
          params: JSON.stringify(rule.params ?? {}),
        },
      });
    }
  });

  const rules = await prisma.alertRule.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    rules: rules.map((r) => ({
      id: r.id,
      chainId: r.chainId,
      kind: r.kind,
      enabled: r.enabled,
      params: JSON.parse(r.params) as Record<string, unknown>,
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}
