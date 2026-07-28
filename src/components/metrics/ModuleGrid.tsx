"use client";

import { ModuleCard } from "@/components/metrics/Module";
import { MODULES } from "@/lib/metrics";

export function ModuleGrid() {
  return (
    <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
      {MODULES.map((m) => (
        <div key={m.id} className="mb-4 break-inside-avoid">
          <ModuleCard id={m.id} />
        </div>
      ))}
    </div>
  );
}
