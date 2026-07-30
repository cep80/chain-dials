"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { isInstrumentId } from "@/lib/share/compose";
import { useInstrumentStage } from "@/lib/instrument-stage";

/** Opens instrument stage from ?i=metronome deep links (share + board). */
export function DeepLinkStage() {
  const params = useSearchParams();
  const open = useInstrumentStage((s) => s.open);

  useEffect(() => {
    const raw = params.get("i");
    if (raw && isInstrumentId(raw)) {
      open(raw);
    }
  }, [params, open]);

  return null;
}
