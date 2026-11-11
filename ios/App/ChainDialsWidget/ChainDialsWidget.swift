import SwiftUI
import WidgetKit

// MARK: - Feed

/// Mirrors `WidgetPayload` in src/lib/widget.ts. Every section is optional so
/// one dead upstream blanks one line, not the widget.
struct WidgetPayload: Codable {
    struct Price: Codable { let usd: Double; let changePct24h: Double? }
    struct Spark: Codable { let points: [Double]; let low: Double; let high: Double }
    struct Block: Codable { let height: Int; let timestamp: Double?; let hash: String? }
    struct Fees: Codable { let fastest: Double; let halfHour: Double; let hour: Double; let economy: Double }
    struct Halving: Codable { let blocksLeft: Int; let progress: Double; let nextHeight: Int; let issuedPct: Double? }
    struct Hashrate: Codable { let current: Double; let heat: Double }
    struct Retarget: Codable { let progress: Double; let change: Double?; let blocksLeft: Double? }

    let v: Int
    let at: Double
    let price: Price?
    let spark: Spark?
    let block: Block?
    let fees: Fees?
    let halving: Halving?
    let hashrate: Hashrate?
    let retarget: Retarget?

    var blockDate: Date? {
        block?.timestamp.map { Date(timeIntervalSince1970: $0 / 1000) }
    }

    static let placeholder = WidgetPayload(
        v: 1,
        at: Date().timeIntervalSince1970 * 1000,
        price: .init(usd: 92_345, changePct24h: 2.4),
        spark: .init(
            points: [0.2, 0.25, 0.18, 0.3, 0.42, 0.38, 0.5, 0.47, 0.6, 0.55, 0.7, 0.66, 0.8, 0.76, 0.9, 1.0],
            low: 90_100, high: 92_600
        ),
        block: .init(
            height: 925_000,
            timestamp: (Date().timeIntervalSince1970 - 252) * 1000,
            hash: "00000000000000000000efc9bc464f716534f5e7b00f23d9b6c228664db21678"
        ),
        fees: .init(fastest: 12, halfHour: 8, hour: 5, economy: 2),
        halving: .init(blocksLeft: 125_000, progress: 0.405, nextHeight: 1_050_000, issuedPct: 95.24),
        hashrate: .init(current: 955e18, heat: 0.62),
        retarget: .init(progress: 41, change: 2.3, blocksLeft: 1190)
    )
}

enum Feed {
    static let cacheKey = "cd.widget.last"
    static let fetchedAtKey = "cd.widget.fetchedAt"

    /// Several widgets share one reading: reuse a fresh enough cached copy instead of refetching.
    static func fetch(reusingWithin seconds: TimeInterval) async -> (payload: WidgetPayload, stale: Bool)? {
        let defaults = UserDefaults.standard
        let age = Date().timeIntervalSince1970 - defaults.double(forKey: fetchedAtKey)
        if seconds > 0, age < seconds,
           let data = defaults.data(forKey: cacheKey),
           let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
            return (payload, false)
        }
        return await fetch()
    }

    static var endpoint: URL {
        let base = (Bundle.main.object(forInfoDictionaryKey: "CDWidgetAPIBase") as? String)
            .flatMap { $0.isEmpty ? nil : $0 } ?? "https://chaindials.com"
        return URL(string: base)!.appendingPathComponent("api/widget")
    }

    static func fetch() async -> (payload: WidgetPayload, stale: Bool)? {
        var req = URLRequest(url: endpoint, timeoutInterval: 12)
        req.cachePolicy = .reloadIgnoringLocalCacheData
        if let (data, res) = try? await URLSession.shared.data(for: req),
           (res as? HTTPURLResponse)?.statusCode == 200,
           let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
            UserDefaults.standard.set(data, forKey: cacheKey)
            UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: fetchedAtKey)
            return (payload, false)
        }
        // Offline or upstream down: show the last good reading, marked stale.
        if let data = UserDefaults.standard.data(forKey: cacheKey),
           let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
            return (payload, true)
        }
        return nil
    }
}

// MARK: - Timeline

struct DialEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload?
    let stale: Bool
}

struct Provider: TimelineProvider {
    /// Minutes until iOS is asked to reload (a hint; the system budgets reloads).
    var refreshMinutes = 15
    /// Extra entries one minute apart, so time-driven art (the metronome hand) moves between reloads.
    var minuteEntries = 1
    /// Reuse a cached reading younger than this rather than refetching.
    var reuseSeconds: TimeInterval = 0

    func placeholder(in context: Context) -> DialEntry {
        DialEntry(date: Date(), payload: .placeholder, stale: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (DialEntry) -> Void) {
        if context.isPreview {
            completion(placeholder(in: context))
            return
        }
        Task {
            let got = await Feed.fetch()
            completion(DialEntry(date: Date(), payload: got?.payload ?? .placeholder, stale: got?.stale ?? false))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DialEntry>) -> Void) {
        Task {
            let got = await Feed.fetch(reusingWithin: reuseSeconds)
            let now = Date()
            let entries = (0..<max(1, minuteEntries)).map { i in
                DialEntry(date: now.addingTimeInterval(TimeInterval(i * 60)), payload: got?.payload, stale: got?.stale ?? true)
            }
            // iOS treats this as a hint and budgets refreshes; retry sooner after a miss.
            let minutes = (got == nil || got!.stale) ? 5 : refreshMinutes
            let next = now.addingTimeInterval(TimeInterval(minutes * 60))
            completion(Timeline(entries: entries, policy: .after(next)))
        }
    }
}

// MARK: - Style

enum Ink {
    static let bg = Color(red: 0.039, green: 0.047, blue: 0.063)        // #0a0c10
    static let paper = Color(red: 0.953, green: 0.937, blue: 0.902)     // #f3efe6
    static let muted = Color(red: 0.659, green: 0.631, blue: 0.584)     // #a8a195
    static let line = Color(red: 0.165, green: 0.192, blue: 0.251)      // #2a3140
    static let accent = Color(red: 0.969, green: 0.576, blue: 0.102)    // #f7931a
    static let up = Color(red: 0.243, green: 0.812, blue: 0.557)        // #3ecf8e
    static let down = Color(red: 1.0, green: 0.361, blue: 0.361)        // #ff5c5c
}

enum Fmt {
    static func usd(_ v: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "USD"
        f.locale = Locale(identifier: "en_US")
        f.maximumFractionDigits = v >= 1000 ? 0 : 2
        return f.string(from: NSNumber(value: v)) ?? "$\(Int(v))"
    }

    static func int(_ v: Int) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.locale = Locale(identifier: "en_US")
        return f.string(from: NSNumber(value: v)) ?? "\(v)"
    }

    static func pct(_ v: Double) -> String {
        String(format: "%@%.1f%%", v >= 0 ? "+" : "", v)
    }

    static func fee(_ v: Double) -> String {
        v < 10 && v != v.rounded() ? String(format: "%.1f", v) : String(Int(v.rounded()))
    }

    static func compact(_ v: Int) -> String {
        v >= 10_000 ? "\(v / 1000)K" : Fmt.int(v)
    }
}

extension View {
    /// iOS 17 wants the background declared so the system can remove it in
    /// StandBy and tinted modes; older systems just draw it.
    @ViewBuilder func dialBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(Ink.bg, for: .widget)
        } else {
            padding().background(Ink.bg)
        }
    }
}

// MARK: - Pieces

struct Sparkline: View {
    let points: [Double]
    let color: Color

    var body: some View {
        GeometryReader { geo in
            let path = Path { p in
                guard points.count > 1 else { return }
                let dx = geo.size.width / CGFloat(points.count - 1)
                for (i, v) in points.enumerated() {
                    let pt = CGPoint(x: CGFloat(i) * dx, y: geo.size.height * (1 - CGFloat(v)))
                    if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
                }
            }
            ZStack {
                path
                    .stroke(color, style: StrokeStyle(lineWidth: 1.6, lineCap: .round, lineJoin: .round))
                // Soft fill under the line so the trend reads at a glance.
                Path { p in
                    p.addPath(path)
                    p.addLine(to: CGPoint(x: geo.size.width, y: geo.size.height))
                    p.addLine(to: CGPoint(x: 0, y: geo.size.height))
                    p.closeSubpath()
                }
                .fill(LinearGradient(colors: [color.opacity(0.28), color.opacity(0)], startPoint: .top, endPoint: .bottom))
            }
        }
    }
}

struct ChangeTag: View {
    let pct: Double?

    var body: some View {
        if let pct {
            Text(Fmt.pct(pct))
                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                .foregroundColor(pct >= 0 ? Ink.up : Ink.down)
        }
    }
}

struct Header: View {
    let pct: Double?
    var body: some View {
        HStack(spacing: 4) {
            Text("₿").font(.system(size: 13, weight: .bold)).foregroundColor(Ink.accent)
            Text("BTC").font(.system(size: 11, weight: .semibold)).foregroundColor(Ink.muted).tracking(1)
            Spacer(minLength: 2)
            ChangeTag(pct: pct)
        }
    }
}

struct BlockLine: View {
    let payload: WidgetPayload
    let stale: Bool

    var body: some View {
        HStack(spacing: 4) {
            if let b = payload.block {
                Text("#\(Fmt.int(b.height))")
                if let d = payload.blockDate {
                    Text("·")
                    // Ticks on its own between timeline reloads.
                    Text(d, style: .relative)
                }
            } else {
                Text("block feed down")
            }
            if stale { Text("· offline").foregroundColor(Ink.down) }
        }
        .font(.system(size: 10, weight: .medium, design: .monospaced))
        .foregroundColor(Ink.muted)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
    }
}

// MARK: - Families

struct SmallDial: View {
    let payload: WidgetPayload
    let stale: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Header(pct: payload.price?.changePct24h)
            Text(payload.price.map { Fmt.usd($0.usd) } ?? "—")
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .foregroundColor(Ink.paper)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            if let s = payload.spark {
                Sparkline(points: s.points, color: trendColor)
            } else {
                Spacer()
            }
            BlockLine(payload: payload, stale: stale)
        }
    }

    var trendColor: Color {
        guard let pct = payload.price?.changePct24h else { return Ink.accent }
        return pct >= 0 ? Ink.up : Ink.down
    }
}

struct FeeRow: View {
    let label: String
    let value: Double?
    var body: some View {
        HStack {
            Text(label).foregroundColor(Ink.muted)
            Spacer()
            Text(value.map(Fmt.fee) ?? "—").foregroundColor(Ink.paper)
        }
        .font(.system(size: 11, weight: .medium, design: .monospaced))
    }
}

struct MediumDial: View {
    let payload: WidgetPayload
    let stale: Bool

    var body: some View {
        HStack(spacing: 14) {
            SmallDial(payload: payload, stale: stale)
            Rectangle().fill(Ink.line).frame(width: 1)
            VStack(alignment: .leading, spacing: 5) {
                Text("FEES · sat/vB")
                    .font(.system(size: 9, weight: .semibold))
                    .tracking(0.8)
                    .foregroundColor(Ink.muted)
                FeeRow(label: "next", value: payload.fees?.fastest)
                FeeRow(label: "30m", value: payload.fees?.halfHour)
                FeeRow(label: "1h", value: payload.fees?.hour)
                Spacer(minLength: 2)
                if let h = payload.halving {
                    Text("HALVING")
                        .font(.system(size: 9, weight: .semibold))
                        .tracking(0.8)
                        .foregroundColor(Ink.muted)
                    ProgressView(value: h.progress)
                        .tint(Ink.accent)
                    Text("\(Fmt.int(h.blocksLeft)) blocks")
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundColor(Ink.paper)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            }
            .frame(maxWidth: 120)
        }
    }
}

struct LockRect: View {
    let payload: WidgetPayload
    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 4) {
                Text("₿").fontWeight(.bold)
                Text(payload.price.map { Fmt.usd($0.usd) } ?? "—")
                    .font(.headline)
                    .widgetAccentable()
            }
            HStack(spacing: 6) {
                if let pct = payload.price?.changePct24h { Text(Fmt.pct(pct)) }
                if let f = payload.fees { Text("\(Fmt.fee(f.fastest)) sat/vB") }
            }
            .font(.caption)
            if let b = payload.block {
                Text("#\(Fmt.int(b.height))").font(.caption2).foregroundStyle(.secondary)
            }
        }
    }
}

struct LockCircle: View {
    let payload: WidgetPayload
    var body: some View {
        if let h = payload.halving {
            Gauge(value: h.progress) {
                Text("₿")
            } currentValueLabel: {
                Text(Fmt.compact(h.blocksLeft)).minimumScaleFactor(0.5)
            }
            .gaugeStyle(.accessoryCircular)
        } else {
            Text("₿")
        }
    }
}

// MARK: - Entry view

struct DialWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: DialEntry

    var body: some View {
        content
            .widgetURL(URL(string: "chaindials://btc"))
    }

    @ViewBuilder var content: some View {
        if let p = entry.payload {
            switch family {
            case .systemMedium:
                MediumDial(payload: p, stale: entry.stale).dialBackground()
            case .accessoryRectangular:
                LockRect(payload: p).lockBackground()
            case .accessoryCircular:
                LockCircle(payload: p).lockBackground()
            case .accessoryInline:
                Text("₿ \(p.price.map { Fmt.usd($0.usd) } ?? "—") \(p.price?.changePct24h.map(Fmt.pct) ?? "")")
            default:
                SmallDial(payload: p, stale: entry.stale).dialBackground()
            }
        } else {
            VStack(spacing: 4) {
                Text("₿").font(.title2.bold()).foregroundColor(Ink.accent)
                Text("Waiting for the chain")
                    .font(.caption2)
                    .foregroundColor(Ink.muted)
                    .multilineTextAlignment(.center)
            }
            .dialBackground()
        }
    }
}

extension View {
    @ViewBuilder func lockBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(.clear, for: .widget)
        } else {
            self
        }
    }
}

// MARK: - Widget

struct BitcoinDialWidget: Widget {
    let kind = "BitcoinDial"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            DialWidgetView(entry: entry)
        }
        .configurationDisplayName("Bitcoin")
        .description("Price, 24h trend, latest block, fees and the halving clock.")
        .supportedFamilies([
            .systemSmall, .systemMedium,
            .accessoryRectangular, .accessoryCircular, .accessoryInline,
        ])
    }
}

@main
struct ChainDialsWidgetBundle: WidgetBundle {
    var body: some Widget {
        BitcoinDialWidget()
        MetronomeWidget()
        SigilWidget()
        ForgeWidget()
        HourglassWidget()
    }
}
