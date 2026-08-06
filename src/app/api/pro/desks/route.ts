import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { normalizeDeskPack } from "@/lib/forensics/desk-pack";
import { prisma } from "@/lib/db";
import { isProActive } from "@/lib/pro";

export const dynamic = "force-dynamic";

async function requireProUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !isProActive(user.proStatus, user.proCurrentPeriodEnd)) {
    return {
      error: NextResponse.json(
        { error: "Pro subscription required for forensics desks." },
        { status: 403 },
      ),
    };
  }
  return { user };
}

export async function GET() {
  const gate = await requireProUser();
  if ("error" in gate && gate.error) return gate.error;
  const user = gate.user!;

  const rows = await prisma.deskPackRecord.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  const desks = rows
    .map((r) => {
      try {
        return normalizeDeskPack(JSON.parse(r.payload));
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return NextResponse.json({ desks });
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

  const parsed = z
    .object({
      desks: z.array(z.unknown()).max(30),
    })
    .safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid desks payload" }, { status: 400 });
  }

  const desks = parsed.data.desks
    .map((d) => normalizeDeskPack(d))
    .filter((d): d is NonNullable<typeof d> => d != null)
    .slice(0, 30);

  await prisma.$transaction(async (tx) => {
    await tx.deskPackRecord.deleteMany({ where: { userId: user.id } });
    for (const desk of desks) {
      await tx.deskPackRecord.create({
        data: {
          userId: user.id,
          name: desk.name,
          chainId: desk.chainId,
          payload: JSON.stringify(desk),
        },
      });
    }
  });

  return NextResponse.json({ desks });
}
