import { describe, expect, it } from "vitest";
import { labelDestination } from "@/lib/forensics/mempool";
import {
  LIQUID_ACTOR,
  LIQUID_PEG,
  LIQUID_SIDESWAP_PAYOUT,
  getLiquidAddress,
  isLiquidActor,
  liquidAsHolder,
  liquidWatchAddresses,
  parseForensicsCase,
} from "@/lib/forensics/liquid";

describe("liquid incident set", () => {
  it("indexes the actor, peg, and SideSwap payout", () => {
    expect(getLiquidAddress(LIQUID_ACTOR)?.role).toBe("actor");
    expect(getLiquidAddress(LIQUID_PEG.toUpperCase())?.role).toBe(
      "federation-peg",
    );
    expect(getLiquidAddress(LIQUID_SIDESWAP_PAYOUT)?.label).toMatch(/SideSwap/i);
    expect(getLiquidAddress("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")).toBeUndefined();
  });

  it("parses the Trace case query", () => {
    expect(parseForensicsCase("liquid")).toBe("liquid");
    expect(parseForensicsCase("coldcard")).toBe("coldcard");
    expect(parseForensicsCase(undefined)).toBe("coldcard");
  });

  it("feeds a four-address watchboard", () => {
    const watched = liquidWatchAddresses();
    expect(watched).toHaveLength(4);
    expect(watched.map((w) => w.address)).toContain(LIQUID_ACTOR);
    expect(liquidAsHolder(getLiquidAddress(LIQUID_ACTOR)!).role).toBe("actor");
    expect(isLiquidActor(LIQUID_ACTOR)).toBe(true);
    expect(isLiquidActor(LIQUID_PEG)).toBe(false);
  });

  it("labels hop destinations for the incident cluster", () => {
    expect(labelDestination(LIQUID_ACTOR, "v1_p2tr")).toEqual({
      kind: "tracked-holder",
      label: "Actor consolidation wallet",
    });
    expect(labelDestination(LIQUID_PEG, "v1_p2tr")).toEqual({
      kind: "tracked-vault",
      label: "Liquid Federation peg wallet",
    });
    expect(labelDestination(LIQUID_SIDESWAP_PAYOUT, "v1_p2tr")).toMatchObject({
      kind: "tracked-collector",
    });
  });
});
