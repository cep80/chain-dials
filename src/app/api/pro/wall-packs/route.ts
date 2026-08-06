import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isProActive } from "@/lib/pro";
import { normalizeWallPack } from "@/lib/wall-packs";

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
        { error: "Pro subscription required for wall packs." },
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

  const rows = await prisma.wallPackRecord.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  const packs = rows
    .map((r) => {
      try {
        return normalizeWallPack(JSON.parse(r.payload));
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return NextResponse.json({ packs });
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
      packs: z.array(z.unknown()).max(12),
    })
    .safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid packs payload" }, { status: 400 });
  }

  const packs = parsed.data.packs
    .map((p) => normalizeWallPack(p))
    .filter((p): p is NonNullable<typeof p> => p != null)
    .slice(0, 12);

  await prisma.$transaction(async (tx) => {
    await tx.wallPackRecord.deleteMany({ where: { userId: user.id } });
    for (const pack of packs) {
      await tx.wallPackRecord.create({
        data: {
          userId: user.id,
          name: pack.name,
          payload: JSON.stringify(pack),
        },
      });
    }
  });

  return NextResponse.json({ packs });
}
