"use client";

import { CadenceDial } from "@/components/viz/CadenceDial";
import type { DialProps } from "@/components/viz/DialPrimitives";

export function ClearingClock(props: DialProps) {
  return <CadenceDial {...props} title="Clock" target={1} noun="block" />;
}
