import SwiftUI
import WidgetKit

// The board's instruments as home-screen widgets. Art comes from DialArt.swift;
// data comes from the shared /api/widget reading (see Feed).

// MARK: - Views

/// The Block Metronome. The hand moves with the minute-by-minute timeline
/// entries; the reading is a system timer, so its seconds tick on their own.
struct MetronomeView: View {
    let entry: DialEntry

    var body: some View {
        let payload = entry.payload
        let blockDate = payload?.blockDate
        let since = blockDate.map { max(0, entry.date.timeIntervalSince($0)) }
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height)
            let unit = side / 240
            ZStack {
                ArtCanvas { ctx in
                    MetronomeArt.draw(ctx, since: since, height: payload?.block?.height, offline: entry.stale, drawReading: false)
                }
                if let blockDate {
                    Text(blockDate, style: .timer)
                        .font(.system(size: MetronomeArt.readingSize * unit, design: .monospaced))
                        .tracking(MetronomeArt.readingSize * unit * 0.08)
                        .foregroundColor(DialInk.label)
                        .multilineTextAlignment(.center)
                        .frame(width: side * 0.6)
                        .position(
                            x: geo.size.width / 2,
                            y: (geo.size.height - side) / 2
                                + (MetronomeArt.readingBaseline - MetronomeArt.readingSize * 0.35) * unit
                        )
                }
            }
        }
        .accessibilityElement()
        .accessibilityLabel(since.map { "Block Metronome. \(Art.duration($0)) since the last block. Target ten minutes." }
            ?? "Block Metronome. Waiting for the latest block.")
    }
}

struct SigilView: View {
    let entry: DialEntry

    var body: some View {
        let block = entry.payload?.block
        ArtCanvas { ctx in
            SigilArt.draw(ctx, hash: block?.hash, height: block?.height)
        }
        .accessibilityElement()
        .accessibilityLabel(block?.hash != nil
            ? "Block Sigil for block \(block!.height). A glyph engraved from the block hash."
            : "Block Sigil. Waiting for the next block.")
    }
}

struct ForgeView: View {
    let entry: DialEntry

    var body: some View {
        let rate = entry.payload?.hashrate
        let retarget = entry.payload?.retarget
        ArtCanvas { ctx in
            ForgeArt.draw(ctx, heat: rate?.heat, rate: rate?.current, epoch: retarget?.progress,
                          change: retarget?.change, offline: entry.stale)
        }
        .accessibilityElement()
        .accessibilityLabel(label)
    }

    private var label: String {
        var text = "Hashrate Forge. "
        if let rate = entry.payload?.hashrate {
            text += "\(ForgeArt.hashrate(rate.current))."
        } else {
            text += "Waiting for hashrate."
        }
        if let retarget = entry.payload?.retarget {
            text += String(format: " Difficulty epoch %.0f%% complete.", retarget.progress)
        }
        return text
    }
}

/// Medium only. The glass and sand are drawn; the readings are real text beside
/// them, because in-art labels would be about 4pt at this size.
struct HourglassView: View {
    let entry: DialEntry

    var body: some View {
        let h = entry.payload?.halving
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 1) {
                Caption("TO HALVING")
                Text(h.map { Art.format($0.blocksLeft) } ?? "—")
                    .font(.system(size: 20, weight: .medium, design: .monospaced))
                    .foregroundColor(DialInk.paper)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Caption("BLOCKS")
                Spacer(minLength: 6)
                Text(h.map { String(format: "%.1f%%", $0.progress * 100) } ?? "—")
                    .font(.system(size: 15, weight: .medium, design: .monospaced))
                    .foregroundColor(DialInk.paper)
                Caption(entry.stale ? "OFFLINE · LAST KNOWN" : "OF THIS ERA", color: entry.stale ? DialInk.down : DialInk.tiny)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            ArtCanvas(viewBox: HourglassArt.viewBox) { ctx in
                HourglassArt.draw(ctx, progress: h?.progress)
            }
            .aspectRatio(HourglassArt.viewBox.width / HourglassArt.viewBox.height, contentMode: .fit)

            VStack(spacing: 3) {
                Caption("21M")
                IssuedTube(fraction: h?.issuedPct.map { $0 / 100 })
                    .frame(width: 12)
                Text(h?.issuedPct.map { String(format: "%.2f%%", $0) } ?? "—")
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundColor(DialInk.paper)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Caption("ISSUED")
            }
            .frame(maxWidth: .infinity)
        }
        .accessibilityElement()
        .accessibilityLabel(h.map {
            String(format: "Issuance Hourglass. Subsidy era %.1f percent complete. %ld blocks to the next halving.", $0.progress * 100, $0.blocksLeft)
        } ?? "Issuance Hourglass. Waiting for block height.")
    }
}

struct Caption: View {
    let text: String
    let color: Color

    init(_ text: String, color: Color = DialInk.tiny) {
        self.text = text
        self.color = color
    }

    var body: some View {
        Text(text)
            .font(.system(size: 9, weight: .medium, design: .monospaced))
            .tracking(0.8)
            .foregroundColor(color)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
    }
}

/// The 21M tube from the web hourglass: a glass capsule filling with sand.
struct IssuedTube: View {
    let fraction: Double?

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .bottom) {
                Capsule().fill(Color(hex: 0x04070C))
                Capsule().stroke(Color(hex: 0x9FB0C8, alpha: 0.35), lineWidth: 0.6)
                if let fraction {
                    let inner = geo.size.width - 5
                    Capsule()
                        .fill(LinearGradient(
                            gradient: Art.stops([
                                (Color(hex: 0xFFF1DC, alpha: 0.9), 0), (DialInk.accent, 0.18), (DialInk.accentDim, 1),
                            ]),
                            startPoint: .top, endPoint: .bottom
                        ))
                        .opacity(0.85)
                        .frame(width: inner, height: max(inner, (geo.size.height - 4) * CGFloat(min(1, max(0, fraction)))))
                        .padding(.bottom, 2)
                }
            }
        }
    }
}

// MARK: - Backgrounds and margins

extension View {
    /// Round dials fill the tile; the dark ground stands in for the board behind them.
    @ViewBuilder func dialFace() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            padding(6).containerBackground(Ink.bg, for: .widget)
        } else {
            padding(6).background(Ink.bg)
        }
    }
}

extension WidgetConfiguration {
    /// iOS 17 adds content margins by default; the dials draw their own bezel edge.
    func dialMarginsDisabled() -> some WidgetConfiguration {
        if #available(iOSApplicationExtension 17.0, *) {
            return contentMarginsDisabled()
        } else {
            return self
        }
    }
}

// MARK: - Widgets

private let boardURL = URL(string: "chaindials://btc")

struct MetronomeWidget: Widget {
    var body: some WidgetConfiguration {
        // One entry a minute for half an hour keeps the hand moving without network calls.
        StaticConfiguration(kind: "BlockMetronome", provider: Provider(refreshMinutes: 30, minuteEntries: 30, reuseSeconds: 180)) { entry in
            MetronomeView(entry: entry).dialFace().widgetURL(boardURL)
        }
        .configurationDisplayName("Block Metronome")
        .description("Time since the latest block. One sweep is the ten-minute target.")
        .supportedFamilies([.systemSmall])
        .dialMarginsDisabled()
    }
}

struct SigilWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BlockSigil", provider: Provider(refreshMinutes: 15, minuteEntries: 1, reuseSeconds: 180)) { entry in
            SigilView(entry: entry).dialFace().widgetURL(boardURL)
        }
        .configurationDisplayName("Block Sigil")
        .description("A glyph engraved from the latest block hash. New block, new glyph.")
        .supportedFamilies([.systemSmall])
        .dialMarginsDisabled()
    }
}

struct ForgeWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "HashrateForge", provider: Provider(refreshMinutes: 30, minuteEntries: 1, reuseSeconds: 600)) { entry in
            ForgeView(entry: entry).dialFace().widgetURL(boardURL)
        }
        .configurationDisplayName("Hashrate Forge")
        .description("Network hashrate as heat, with the difficulty epoch in orbit.")
        .supportedFamilies([.systemSmall])
        .dialMarginsDisabled()
    }
}

struct HourglassWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "IssuanceHourglass", provider: Provider(refreshMinutes: 30, minuteEntries: 1, reuseSeconds: 600)) { entry in
            HourglassView(entry: entry).dialBackground().widgetURL(boardURL)
        }
        .configurationDisplayName("Issuance Hourglass")
        .description("Sand tracks this subsidy era, counting down to the next halving.")
        .supportedFamilies([.systemMedium])
    }
}
