import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** X summary_large_image card - high contrast, brand whisper, big number. */
export function renderShareCard(opts: {
  brand: string;
  chainLabel: string;
  title: string;
  headline: string;
  sub: string;
  accent: string;
}): ImageResponse {
  const { brand, chainLabel, title, headline, sub, accent } = opts;
  const big =
    headline.length > 28 ? 48 : headline.length > 18 ? 64 : headline.length > 12 ? 80 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background: "#0a0c10",
          color: "#f4f1ea",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 80% 60% at 70% 20%, ${accent}33, transparent 55%)`,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            <span>{brand}</span>
            <span style={{ color: accent }}>Dials</span>
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 16px",
              borderRadius: 999,
              background: accent,
              color: "#0a0c10",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {chainLabel}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            position: "relative",
            marginTop: 24,
          }}
        >
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 600,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: big,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              maxWidth: 1000,
              wordBreak: "break-word",
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#9aa3b2",
              marginTop: 8,
            }}
          >
            {sub}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            position: "relative",
            borderTop: "1px solid #1e2430",
            paddingTop: 24,
            fontSize: 20,
            color: "#9aa3b2",
          }}
        >
          <span>Live network dials · not a trading terminal</span>
          <span style={{ color: accent }}>chaindials.com</span>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
