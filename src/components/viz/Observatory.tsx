"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BlockMetronome } from "@/components/viz/BlockMetronome";
import { HashrateForge } from "@/components/viz/HashrateForge";
import { IssuanceHourglass } from "@/components/viz/IssuanceHourglass";
import { MempoolAtmosphere } from "@/components/viz/MempoolAtmosphere";
import { TipSigil } from "@/components/viz/TipSigil";

export function Observatory({ large = false }: { large?: boolean }) {
  const reduce = useReducedMotion();

  return (
    <section aria-labelledby="observatory-heading" className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent">
            Observatory
          </p>
          <h2
            id="observatory-heading"
            className="text-2xl font-bold tracking-tight text-paper md:text-3xl"
          >
            Network instruments
          </h2>
          <p className="mt-1 max-w-xl text-sm text-paper-muted">
            Cadence, congestion, tip identity, issuance, and security — felt, not
            just counted. Expand any instrument for stage; on Atmosphere, click a
            bright dot to inspect or empty space to open stage.
          </p>
        </div>
      </div>

      <motion.div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="sm:col-span-1 xl:col-span-2">
          <BlockMetronome large={large} />
        </div>
        <div className="sm:col-span-1 xl:col-span-2">
          <MempoolAtmosphere large={large} />
        </div>
        <div className="sm:col-span-2 xl:col-span-2">
          <TipSigil large={large} />
        </div>
        <div className="sm:col-span-1 xl:col-span-3">
          <IssuanceHourglass large={large} />
        </div>
        <div className="sm:col-span-1 xl:col-span-3">
          <HashrateForge large={large} />
        </div>
      </motion.div>
    </section>
  );
}
