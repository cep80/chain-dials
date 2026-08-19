import { NextResponse } from "next/server";
import { z } from "zod";
import { cbRest } from "@/lib/cargobase";
import { requireProUser } from "@/lib/cargobase-session";
import { normalizeDeskPack } from "@/lib/forensics/desk-pack";

export const dynamic = "force-dynamic";

const MAX_DESKS = 30;

type DeskRow = { payload: unknown };

export async function GET(req: Request) {
  const gate = await requireProUser(req, "forensics desks");
  if ("error" in gate) return gate.error;

  const rows = await cbRest<DeskRow[]>(
    "desk_packs?select=payload&order=updated_at.desc",
    { token: gate.user.token },
  );
  const desks = rows
    .map((r) => normalizeDeskPack(r.payload))
    .filter((d): d is NonNullable<typeof d> => d != null);

  return NextResponse.json({ desks });
}

export async function PUT(req: Request) {
  const gate = await requireProUser(req, "forensics desks");
  if ("error" in gate) return gate.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = z.object({ desks: z.array(z.unknown()).max(MAX_DESKS) }).safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid desks payload" }, { status: 400 });
  }

  const desks = parsed.data.desks
    .map((d) => normalizeDeskPack(d))
    .filter((d): d is NonNullable<typeof d> => d != null)
    .slice(0, MAX_DESKS);

  // Replace the caller's set. Not a transaction — see the note in the alerts
  // route — but both halves are scoped to the caller by row-level security.
  await cbRest("desk_packs?id=not.is.null", {
    method: "DELETE",
    token: gate.user.token,
  });

  if (desks.length > 0) {
    await cbRest("desk_packs", {
      method: "POST",
      token: gate.user.token,
      body: desks.map((desk) => ({
        name: desk.name,
        chain_id: desk.chainId,
        payload: desk,
      })),
    });
  }

  return NextResponse.json({ desks });
}
