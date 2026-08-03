import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isProActive } from "@/lib/pro";

export const dynamic = "force-dynamic";

const layoutSchema = z.object({
  name: z.string().trim().min(1).max(60),
  chainId: z.enum(["btc", "eth", "sol", "hype"]),
  favorites: z.array(z.string()).min(1).max(40),
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
        { error: "Pro subscription required for saved layouts." },
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

  const layouts = await prisma.savedLayout.findMany({
    where: {
      userId: user.id,
      ...(chainId ? { chainId } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    layouts: layouts.map((l) => ({
      id: l.id,
      name: l.name,
      chainId: l.chainId,
      favorites: JSON.parse(l.favorites) as string[],
      updatedAt: l.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const gate = await requireProUser();
  if ("error" in gate && gate.error) return gate.error;
  const user = gate.user!;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = layoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid layout payload" }, { status: 400 });
  }

  const count = await prisma.savedLayout.count({ where: { userId: user.id } });
  if (count >= 20) {
    return NextResponse.json(
      { error: "Layout limit reached (20). Delete one first." },
      { status: 400 },
    );
  }

  const layout = await prisma.savedLayout.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      chainId: parsed.data.chainId,
      favorites: JSON.stringify(parsed.data.favorites),
    },
  });

  return NextResponse.json({
    layout: {
      id: layout.id,
      name: layout.name,
      chainId: layout.chainId,
      favorites: parsed.data.favorites,
      updatedAt: layout.updatedAt.toISOString(),
    },
  }, { status: 201 });
}

export async function DELETE(req: Request) {
  const gate = await requireProUser();
  if ("error" in gate && gate.error) return gate.error;
  const user = gate.user!;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const existing = await prisma.savedLayout.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.savedLayout.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
