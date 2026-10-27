import type { Metadata } from "next";
import { InstrumentReviewHarness } from "@/components/review/InstrumentReviewHarness";

export const metadata: Metadata = {
  title: "Instrument review harness",
  robots: { index: false, follow: false, nocache: true },
};

/** Development review page for the chain dials. Fixture data; noindex. */
export default function InstrumentReviewPage() {
  return <InstrumentReviewHarness />;
}
