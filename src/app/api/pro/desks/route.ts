import { NextResponse } from "next/server";
import { z } from "zod";
import { notIn, sbRest } from "@/lib/supabase";
import { requireProUser } from "@/lib/supabase-session";
import { normalizeDeskPack } from "@/lib/forensics/desk-pack";

export const dynamic = "force-dynamic";

const MAX_DESKS = 30;

type DeskRow = { payload: unknown };

export async function GET(req: Request) {
  const gate = await requireProUser(req, "forensics desks");
  if ("error" in gate) return gate.error;

  const rows = await sbRest<DeskRow[]>(
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

  // Replace the caller's set: insert the new rows first, then drop the rest.
  // A failed insert leaves the old set intact instead of wiping it. Both halves
  // are scoped to the caller by row-level security.
  const inserted =
    desks.length > 0
      ? await sbRest<{ id: string }[]>("desk_packs?select=id", {
          method: "POST",
          token: gate.user.token,
          representation: true,
          body: desks.map((desk) => ({
            name: desk.name,
            chain_id: desk.chainId,
            payload: desk,
          })),
        })
      : [];
  await sbRest(`desk_packs?${notIn(inserted)}`, {
    method: "DELETE",
    token: gate.user.token,
  });

  return NextResponse.json({ desks });
}
