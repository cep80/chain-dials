"use client";

import { CadenceDial } from "@/components/viz/CadenceDial";
import type { DialProps } from "@/components/viz/DialPrimitives";

export function TurbineTach(props: DialProps) {
  return <CadenceDial {...props} title="Tach" target={0.4} noun="slot" />;
}
