import SwiftUI

// Native port of the web dials (src/components/viz/DialPrimitives.tsx and the
// instrument components). Everything is drawn in the same 240-unit viewBox as
// the SVG, so coordinates copy across one for one. The Android port lives in
// android/app/src/main/java/com/chaindials/app/widget/*Art.java.

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}

enum DialInk {
    static let accent = Color(hex: 0xF7931A)
    static let accentDim = Color(hex: 0xC46E0A)
    static let warn = Color(hex: 0xE6B84D)
    static let down = Color(hex: 0xFF5C5C)
    static let up = Color(hex: 0x3ECF8E)
    static let tiny = Color(hex: 0x93A7C9)
    static let label = Color(hex: 0xF3F6FB)
    static let paper = Color(hex: 0xF3EFE6)
    static let face = Color(hex: 0x0B131F)
    /// Widgets sit much smaller than the web dial, so small type gets a lift.
    static let tinySize: CGFloat = 9
}

// MARK: - Canvas plumbing

/// Draws `paint` into a fixed viewBox, scaled to fit and centred in the view.
struct ArtCanvas: View {
    var viewBox = CGRect(x: 0, y: 0, width: 240, height: 240)
    let paint: (GraphicsContext) -> Void

    var body: some View {
        Canvas { ctx, size in
            let s = min(size.width / viewBox.width, size.height / viewBox.height)
            var c = ctx
            c.translateBy(x: (size.width - viewBox.width * s) / 2, y: (size.height - viewBox.height * s) / 2)
            c.scaleBy(x: s, y: s)
            c.translateBy(x: -viewBox.minX, y: -viewBox.minY)
            paint(c)
        }
    }
}

enum Art {
    static func polar(_ r: CGFloat, _ deg: CGFloat, cx: CGFloat = 120, cy: CGFloat = 120) -> CGPoint {
        let a = (deg - 90) * .pi / 180
        return CGPoint(x: cx + cos(a) * r, y: cy + sin(a) * r)
    }

    static func circle(_ c: CGPoint, _ r: CGFloat) -> Path {
        Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2))
    }

    static func circle(_ r: CGFloat) -> Path {
        circle(CGPoint(x: 120, y: 120), r)
    }

    static func oval(_ cx: CGFloat, _ cy: CGFloat, _ rx: CGFloat, _ ry: CGFloat) -> Path {
        Path(ellipseIn: CGRect(x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2))
    }

    static func line(_ a: CGPoint, _ b: CGPoint) -> Path {
        Path { p in
            p.move(to: a)
            p.addLine(to: b)
        }
    }

    static func line(_ x1: CGFloat, _ y1: CGFloat, _ x2: CGFloat, _ y2: CGFloat) -> Path {
        line(CGPoint(x: x1, y: y1), CGPoint(x: x2, y: y2))
    }

    /// Arc along a dial ring in polar() degrees (0 at twelve o'clock, increasing clockwise).
    static func ringArc(_ r: CGFloat, _ from: CGFloat, _ to: CGFloat) -> Path {
        Path { p in
            // SwiftUI's y axis points down, so clockwise: false sweeps clockwise on screen.
            p.addArc(center: CGPoint(x: 120, y: 120), radius: r,
                     startAngle: .degrees(Double(from - 90)), endAngle: .degrees(Double(to - 90)), clockwise: false)
        }
    }

    static func stops(_ s: [(Color, CGFloat)]) -> Gradient {
        Gradient(stops: s.map { Gradient.Stop(color: $0.0, location: $0.1) })
    }

    /// SVG text sits on its baseline; this centres the glyphs about a third of the size above it.
    static func text(_ ctx: GraphicsContext, _ s: String, _ x: CGFloat, _ y: CGFloat,
                     size: CGFloat = DialInk.tinySize, color: Color = DialInk.tiny,
                     spacing: CGFloat = 0.1, anchor: UnitPoint = .center) {
        let t = Text(s)
            .font(.system(size: size, design: .monospaced))
            .tracking(size * spacing)
            .foregroundColor(color)
        ctx.draw(t, at: CGPoint(x: x, y: y - size * 0.35), anchor: anchor)
    }

    static func format(_ v: Int) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.locale = Locale(identifier: "en_US")
        return f.string(from: NSNumber(value: v)) ?? "\(v)"
    }

    /// formatDuration() from src/lib/format.ts.
    static func duration(_ seconds: Double) -> String {
        let s = max(0, Int(seconds.rounded(.down)))
        let h = s / 3600, m = (s % 3600) / 60, sec = s % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, sec) : String(format: "%d:%02d", m, sec)
    }

    // MARK: Bezel

    /// DialBezel up to its children: shadow, metal rim, lit face, tick ring, screws.
    static func bezelBack(_ ctx: GraphicsContext, ticks: Int) {
        ctx.fill(circle(CGPoint(x: 120, y: 123), 112), with: .color(.black.opacity(0.35)))
        ctx.fill(circle(111), with: .linearGradient(stops([
            (Color(hex: 0xC3CEDE, alpha: 0.48), 0),
            (Color(hex: 0x17212F), 0.24),
            (Color(hex: 0x080F19), 0.51),
            (Color(hex: 0x6E8098, alpha: 0.45), 0.77),
            (Color(hex: 0x0B111B), 1),
        ]), startPoint: CGPoint(x: 9, y: 9), endPoint: CGPoint(x: 231, y: 231)))
        ctx.stroke(circle(111), with: .color(Color(hex: 0xA4B9D2, alpha: 0.2)), lineWidth: 0.6)

        ctx.fill(circle(106), with: .color(DialInk.face))
        // Key light up and to the left (LIGHT_RIG.key 40% / 30% of the face box).
        ctx.fill(circle(106), with: .radialGradient(stops([
            (DialInk.accent.opacity(0.16), 0),
            (DialInk.face.opacity(0), 0.55),
            (Color(hex: 0x050910, alpha: 0.92), 1),
        ]), center: CGPoint(x: 98.8, y: 77.6), startRadius: 0, endRadius: 159))
        ctx.stroke(circle(106), with: .color(Color(hex: 0x02050A)), lineWidth: 2)
        ctx.stroke(circle(103), with: .color(Color(hex: 0xCFDDF0, alpha: 0.15)), lineWidth: 0.5)
        ctx.stroke(circle(77), with: .color(DialInk.accent.opacity(0.1)), lineWidth: 0.5)

        for i in 0..<ticks {
            let major = i % 4 == 0
            let deg = CGFloat(i) * 360 / CGFloat(ticks)
            let a = polar(major ? 94 : 98, deg)
            let b = polar(101, deg)
            ctx.stroke(line(a, b),
                       with: .color(major ? Color(hex: 0xB7C7DF, alpha: 0.8) : Color(hex: 0x53627A, alpha: 0.65)),
                       lineWidth: major ? 1 : 0.65)
        }

        for deg in stride(from: CGFloat(45), to: 360, by: 90) {
            let p = polar(109, deg)
            ctx.fill(circle(p, 1.2), with: .color(Color(hex: 0x070C14)))
            ctx.stroke(line(p.x - 0.7, p.y, p.x + 0.7, p.y), with: .color(Color(hex: 0x8290A5)), lineWidth: 0.5)
        }
    }

    /// The glass sheen laid over everything inside the bezel.
    static func bezelGlass(_ ctx: GraphicsContext) {
        ctx.fill(circle(102), with: .linearGradient(stops([
            (Color(hex: 0xE6F0FF, alpha: 0.09), 0),
            (Color(hex: 0xE6F0FF, alpha: 0), 0.5),
            (DialInk.accent.opacity(0.04), 1),
        ]), startPoint: CGPoint(x: 18, y: 18), endPoint: CGPoint(x: 18 + 0.7 * 204, y: 222)))
    }
}

// MARK: - Block Metronome

enum MetronomeArt {
    static let target: Double = 600

    enum Tone { case calm, late, stale }

    /// Same thresholds as metronomeTone() in src/lib/viz-scale.ts.
    static func tone(_ since: Double?) -> Tone {
        guard let since else { return .calm }
        if since > target * 2 { return .stale }
        if since > target * 1.2 { return .late }
        return .calm
    }

    static func color(_ t: Tone) -> Color {
        switch t {
        case .calm: return DialInk.accent
        case .late: return DialInk.warn
        case .stale: return DialInk.down
        }
    }

    static let readingSize: CGFloat = 15
    static let readingBaseline: CGFloat = 164

    /// - Parameter drawReading: false when the view overlays a live timer instead.
    static func draw(_ ctx: GraphicsContext, since: Double?, height: Int?, offline: Bool, drawReading: Bool) {
        let t = offline ? Tone.calm : tone(since)
        let stroke = color(t)
        let raw = (since ?? 0) / target
        let laps = Int(raw.rounded(.down))
        let angle = since == nil ? 0 : raw * 360

        Art.bezelBack(ctx, ticks: 20)

        if t != .calm {
            ctx.fill(Art.circle(102), with: .radialGradient(Art.stops([
                (stroke.opacity(t == .late ? 0.14 : 0.2), 0),
                (stroke.opacity(0), 1),
            ]), center: CGPoint(x: 120, y: 120), startRadius: 0, endRadius: 102))
        }

        // The expected window: one lap, a soft band from 0 to the target.
        ctx.stroke(Art.circle(88), with: .color(stroke.opacity(0.08)), lineWidth: 5)

        for i in 0..<10 {
            let p = Art.polar(80, CGFloat(i) * 36)
            let minutes = target * Double(i) / 10 / 60
            let n = minutes == minutes.rounded() ? String(Int(minutes)) : String(format: "%.1f", minutes)
            if i == 0 {
                Art.text(ctx, n, p.x, p.y + 3.2, size: 11, color: DialInk.label)
            } else {
                Art.text(ctx, n, p.x, p.y + 3, size: 9.6)
            }
        }
        Art.text(ctx, "MIN SINCE BLOCK", 120, 99, spacing: 0.08)

        // Overdue laps become studs on the bezel.
        for i in 0..<min(12, laps) {
            let p = Art.polar(108.5, CGFloat(i) * 9 + 4.5)
            ctx.fill(Art.circle(p, 2.9), with: .color(stroke.opacity(0.22)))
            ctx.fill(Art.circle(p, 1.6), with: .color(stroke))
        }

        if since != nil {
            var layer = ctx
            layer.opacity = offline ? 0.45 : 1

            // Contact shadow follows the key light (LIGHT_RIG.shadow, dy 3).
            var shadow = layer
            shadow.translateBy(x: 1.8, y: 3)
            rotate(&shadow, angle)
            shadow.fill(Path { p in
                p.move(to: CGPoint(x: 118.4, y: 142))
                p.addLine(to: CGPoint(x: 119.4, y: 40))
                p.addLine(to: CGPoint(x: 120.6, y: 40))
                p.addLine(to: CGPoint(x: 121.6, y: 142))
                p.closeSubpath()
            }, with: .color(.black.opacity(0.45)))

            var hand = layer
            rotate(&hand, angle)
            hand.fill(Path { p in
                p.move(to: CGPoint(x: 117.2, y: 144))
                p.addLine(to: CGPoint(x: 119.3, y: 40))
                p.addLine(to: CGPoint(x: 120.7, y: 40))
                p.addLine(to: CGPoint(x: 122.8, y: 144))
                p.closeSubpath()
            }, with: .linearGradient(Art.stops([
                (Color(hex: 0xF6F9FF), 0), (Color(hex: 0xDBE5F3), 0.5), (Color(hex: 0x8D9DB5), 1),
            ]), startPoint: CGPoint(x: 117.2, y: 0), endPoint: CGPoint(x: 122.8, y: 0)))
            hand.stroke(Art.line(120, 44, 120, 102), with: .color(stroke), lineWidth: 1.3)
            hand.fill(Art.circle(CGPoint(x: 120, y: 140), 4.6), with: .color(Color(hex: 0x1A2433)))
            hand.stroke(Art.circle(CGPoint(x: 120, y: 140), 4.6), with: .color(Color(hex: 0x8D9DB5)), lineWidth: 0.6)
            hand.fill(Art.circle(CGPoint(x: 120, y: 44), 2.2), with: .color(stroke))
        }

        ctx.fill(Art.circle(8.5), with: .radialGradient(Art.stops([
            (Color(hex: 0xF2F6FC), 0), (Color(hex: 0x8899B1), 0.45), (Color(hex: 0x1A2433), 1),
        ]), center: CGPoint(x: 117.96, y: 116.94), startRadius: 0, endRadius: 11.9))
        ctx.stroke(Art.circle(8.5), with: .color(Color(hex: 0x02050A)), lineWidth: 0.8)
        ctx.fill(Art.circle(2.4), with: .color(stroke))

        if let since {
            if drawReading {
                Art.text(ctx, Art.duration(since), 120, readingBaseline, size: readingSize, color: DialInk.label, spacing: 0.08)
            }
        } else {
            Art.text(ctx, "AWAITING TIP", 120, readingBaseline, size: 11, color: DialInk.label)
        }

        let note = offline ? "OFFLINE · LAST KNOWN"
            : laps > 0 ? "+\(laps) LAP\(laps == 1 ? "" : "S") OVER 10 MIN"
            : "TARGET 10 MIN"
        Art.text(ctx, note, 120, 180, color: offline ? DialInk.down : t == .calm ? DialInk.tiny : stroke, spacing: 0.06)
        if let height {
            Art.text(ctx, "#\(Art.format(height))", 120, 192, color: DialInk.tiny.opacity(0.7))
        }

        Art.bezelGlass(ctx)
    }

    private static func rotate(_ ctx: inout GraphicsContext, _ degrees: Double) {
        ctx.translateBy(x: 120, y: 120)
        ctx.rotate(by: .degrees(degrees))
        ctx.translateBy(x: -120, y: -120)
    }
}

// MARK: - Block Sigil

/// buildSigil() from src/lib/hash-sigil.ts, line for line, so a block looks
/// identical on the board and on the home screen.
enum SigilArt {
    enum Kind { case line, chord, arc, dot }

    struct Segment {
        var kind: Kind
        var x1: CGFloat = 0, y1: CGFloat = 0, x2: CGFloat = 0, y2: CGFloat = 0
        var r: CGFloat = 0, start: Double = 0, end: Double = 0
        var weight: CGFloat = 1
        var accent = false
    }

    static func clean(_ hash: String) -> [Int] {
        var h = hash.lowercased()
        if h.hasPrefix("0x") { h.removeFirst(2) }
        var digits = h.prefix(64).map { Int(String($0), radix: 16) ?? 0 }
        while digits.count < 64 { digits.append(0) }
        return digits
    }

    static func build(_ d: [Int], size: CGFloat = 120) -> (rings: [CGFloat], segments: [Segment]) {
        func nib(_ i: Int) -> Int { d[i % d.count] }
        func pair(_ i: Int) -> Int { (nib(i) << 4) | nib(i + 1) }
        let cx = size / 2, cy = size / 2
        var rings: [CGFloat] = []
        var segs: [Segment] = []

        let ringCount = 2 + nib(0) % 3
        for i in 0..<ringCount {
            let jitter: CGFloat = CGFloat(nib(2 + i)) / 16 * 0.04
            let k: CGFloat = 0.18 + CGFloat(i) * 0.14 + jitter
            rings.append(size * k)
        }
        let last = rings[rings.count - 1]

        let spokeCount = 6 + nib(8) % 7
        for i in 0..<spokeCount {
            let turn: Double = Double(pair(10 + i * 2)) / 255 * 2 * Double.pi
            let angle: Double = (turn + Double(i)).truncatingRemainder(dividingBy: 2 * Double.pi)
            let reach: Double = 0.55 + Double(nib(20 + i)) / 16 * 0.45
            let len: Double = Double(last) * reach
            var s = Segment(kind: .line)
            s.x1 = cx; s.y1 = cy
            s.x2 = cx + CGFloat(cos(angle) * len)
            s.y2 = cy + CGFloat(sin(angle) * len)
            s.weight = 0.8 + CGFloat(nib(30 + i) % 3) * 0.4
            s.accent = nib(40 + i) > 11
            segs.append(s)
        }

        for i in 0..<rings.count {
            let start: Double = Double(pair(48 + i * 2)) / 255 * 2 * Double.pi
            let sweep: Double = (0.4 + Double(nib(54 + i)) / 16) * Double.pi
            var s = Segment(kind: .arc)
            s.x1 = cx; s.y1 = cy
            s.r = rings[i]
            s.start = start
            s.end = start + sweep
            s.weight = 1.2 + CGFloat(i % 2) * 0.5
            s.accent = i == rings.count - 1
            segs.append(s)
        }

        for i in 0..<4 {
            let a1: Double = Double(pair(56 + i)) / 255 * 2 * Double.pi
            let a2: Double = a1 + Double.pi * (0.3 + Double(nib(60 + i)) / 32)
            let r = Double(last) * 0.85
            var s = Segment(kind: .chord)
            s.x1 = cx + CGFloat(cos(a1) * r); s.y1 = cy + CGFloat(sin(a1) * r)
            s.x2 = cx + CGFloat(cos(a2) * r); s.y2 = cy + CGFloat(sin(a2) * r)
            s.weight = 0.7
            s.accent = nib(62 + i) > 12
            segs.append(s)
        }

        for i in 0..<3 {
            let a: Double = Double(i) / 3 * 2 * Double.pi + Double(nib(i)) / 16
            let spread: Double = 0.06 + Double(nib(5 + i)) / 16 * 0.05
            let dist: Double = Double(size) * spread
            var s = Segment(kind: .dot)
            s.x1 = cx + CGFloat(cos(a) * dist); s.y1 = cy + CGFloat(sin(a) * dist)
            s.r = 1.2 + CGFloat(nib(7 + i) % 3) * 0.6
            s.accent = i == 0
            segs.append(s)
        }
        return (rings, segs)
    }

    /// The web places the glyph at 1.42; the widget shrinks it to make room for captions.
    static let glyphScale: CGFloat = 1.1

    static func draw(_ ctx: GraphicsContext, hash: String?, height: Int?) {
        Art.bezelBack(ctx, ticks: 24)

        ctx.fill(Art.circle(84), with: .radialGradient(Art.stops([
            (Color(hex: 0x1B2433), 0), (Color(hex: 0x0A1019), 0.6), (Color(hex: 0x05080D), 1),
        ]), center: CGPoint(x: 103.2, y: 86.4), startRadius: 0, endRadius: 126))
        ctx.stroke(Art.circle(84), with: .color(Color(hex: 0x02050A)), lineWidth: 1.2)
        ctx.stroke(Art.circle(83), with: .color(Color(hex: 0xCFDCF0, alpha: 0.12)), lineWidth: 0.6)
        ctx.fill(Art.circle(80), with: .radialGradient(Art.stops([
            (DialInk.accent.opacity(0.16), 0), (DialInk.accent.opacity(0), 1),
        ]), center: CGPoint(x: 120, y: 120), startRadius: 0, endRadius: 80))

        if let hash {
            let d = clean(hash)
            // Outer ring: all 64 digits as tick lengths, so no byte is dropped.
            for (i, n) in d.enumerated() {
                let deg = CGFloat(i) * 360 / 64
                let a = Art.polar(88.5, deg)
                let b = Art.polar(88.5 + 1.6 + CGFloat(n) * 0.42, deg)
                let col = n > 11 ? DialInk.accent.opacity(0.95) : Color(hex: 0x9FB0C8, alpha: 0.35 + Double(n) / 40)
                ctx.stroke(Art.line(a, b), with: .color(col), style: StrokeStyle(lineWidth: 1.1, lineCap: .round))
            }

            let g = build(d)
            var place = ctx
            place.translateBy(x: 120, y: 120)
            place.scaleBy(x: glyphScale, y: glyphScale)
            place.translateBy(x: -60, y: -60)
            engrave(place, g, lit: false)
            engrave(place, g, lit: true)
        } else {
            ctx.stroke(Art.circle(52), with: .color(Color(hex: 0x9FB0C8, alpha: 0.3)),
                       style: StrokeStyle(lineWidth: 0.6, dash: [2, 4]))
            Art.text(ctx, "AWAITING BLOCK", 120, 123)
        }

        // Captions sit inside the plate, clear of the digit ring and the bezel ticks.
        Art.text(ctx, "BLOCK", 120, 50, spacing: 0.14)
        Art.text(ctx, height.map { "#\(Art.format($0))" } ?? "—", 120, 64, size: 12.5, color: DialInk.label, spacing: 0.08)
        if let hash {
            let tail = String(clean(hash).suffix(8).map { String($0, radix: 16) }.joined())
            Art.text(ctx, "HASH …\(tail)", 120, 196)
        }

        Art.bezelGlass(ctx)
    }

    /// Each stroke is cut twice: a shadow offset away from the key light, then the lit metal.
    private static func engrave(_ base: GraphicsContext, _ g: (rings: [CGFloat], segments: [Segment]), lit: Bool) {
        var ctx = base
        if !lit { ctx.translateBy(x: 0.35, y: 0.5) }
        let metal = Color(hex: 0xD6DEEA)
        for r in g.rings {
            ctx.stroke(Art.circle(CGPoint(x: 60, y: 60), r),
                       with: .color(lit ? Color(hex: 0x7C8CA6, alpha: 0.45) : .black.opacity(0.4)), lineWidth: 0.45)
        }
        for s in g.segments {
            let colour: Color = lit ? (s.accent ? DialInk.accent : metal) : .black
            switch s.kind {
            case .line, .chord:
                let op = lit ? (s.kind == .chord ? 0.7 : 0.92) : 0.55
                ctx.stroke(Art.line(s.x1, s.y1, s.x2, s.y2), with: .color(colour.opacity(op)),
                           style: StrokeStyle(lineWidth: s.weight * 0.8, lineCap: .round))
            case .arc:
                let arc = Path { p in
                    p.addArc(center: CGPoint(x: s.x1, y: s.y1), radius: s.r,
                             startAngle: .radians(s.start), endAngle: .radians(s.end), clockwise: false)
                }
                ctx.stroke(arc, with: .color(colour.opacity(lit ? 0.95 : 0.55)),
                           style: StrokeStyle(lineWidth: s.weight * 0.95, lineCap: .round))
            case .dot:
                ctx.fill(Art.circle(CGPoint(x: s.x1, y: s.y1), s.r * 0.85), with: .color(colour.opacity(lit ? 1 : 0.55)))
            }
        }
    }
}

// MARK: - Hashrate Forge

enum ForgeArt {
    static func hashrate(_ hps: Double) -> String {
        let eh = hps / 1e18
        return eh >= 1 ? String(format: "%.1f EH/s", eh) : String(format: "%.1f PH/s", hps / 1e15)
    }

    static func draw(_ ctx: GraphicsContext, heat: Double?, rate: Double?, epoch: Double?, change: Double?, offline: Bool) {
        let h = CGFloat(max(0, min(1, heat ?? 0)))
        Art.bezelBack(ctx, ticks: 24)

        ctx.fill(Art.circle(CGPoint(x: 120, y: 128), 80), with: .radialGradient(Art.stops([
            (DialInk.accent.opacity(Double(0.08 + h * 0.3)), 0),
            (DialInk.accent.opacity(Double(h * 0.08)), 0.55),
            (DialInk.accent.opacity(0), 1),
        ]), center: CGPoint(x: 120, y: 147.2), startRadius: 0, endRadius: 80))

        // Heat scale.
        let segments = 24
        let lit = Int((h * CGFloat(segments)).rounded())
        for i in 0..<segments {
            let step: CGFloat = 240 / CGFloat(segments)
            let a0: CGFloat = -120 + CGFloat(i) * step + 1.2
            let a1: CGFloat = -120 + CGFloat(i + 1) * step - 1.2
            let t = CGFloat(i) / CGFloat(segments - 1)
            let col: Color = i < lit
                ? (t > 0.85 ? Color(hex: 0xFFF1D8) : DialInk.accent).opacity(Double(0.45 + t * 0.55))
                : Color(hex: 0x1B2534)
            ctx.stroke(Art.ringArc(77, a0, a1), with: .color(col), lineWidth: 6)
        }
        let marks: [(String, CGFloat)] = [("LOW", -120), ("MID", 0), ("HIGH", 120)]
        for (label, deg) in marks {
            let p = Art.polar(64, deg)
            Art.text(ctx, label, p.x, p.y + 2.5)
        }
        Art.text(ctx, "HEAT VS RECENT RANGE", 120, 81, spacing: 0.04)
        if let rate {
            Art.text(ctx, hashrate(rate), 120, 101, size: 12.5, color: DialInk.label, spacing: 0.06)
        }

        // Crucible.
        ctx.fill(Art.oval(120, 171, 40, 6), with: .color(.black.opacity(0.4)))
        let body = Path { p in
            p.move(to: CGPoint(x: 84, y: 128))
            p.addLine(to: CGPoint(x: 92, y: 164))
            p.addCurve(to: CGPoint(x: 148, y: 164), control1: CGPoint(x: 96, y: 172), control2: CGPoint(x: 144, y: 172))
            p.addLine(to: CGPoint(x: 156, y: 128))
            p.closeSubpath()
        }
        ctx.fill(body, with: .linearGradient(Art.stops([
            (Color(hex: 0x7D8CA3), 0), (Color(hex: 0x253042), 0.28), (Color(hex: 0x0C121B), 0.72), (Color(hex: 0x3B4A5F), 1),
        ]), startPoint: CGPoint(x: 84, y: 128), endPoint: CGPoint(x: 156, y: 170)))
        ctx.stroke(body, with: .color(Color(hex: 0xA9B8CC, alpha: 0.35)), lineWidth: 0.6)
        ctx.stroke(Art.line(90, 136, 96, 162), with: .color(Color(hex: 0xE8EEF8, alpha: 0.2)),
                   style: StrokeStyle(lineWidth: 1.2, lineCap: .round))
        for i in 0..<3 {
            let fi = CGFloat(i)
            ctx.stroke(Art.line(87 + fi * 0.6, 140 + fi * 9, 153 - fi * 0.6, 140 + fi * 9),
                       with: .color(.black.opacity(0.35)), lineWidth: 0.7)
        }
        ctx.fill(Art.oval(120, 128, 36, 7), with: .color(Color(hex: 0x05080D)))
        ctx.stroke(Art.oval(120, 128, 36, 7), with: .color(Color(hex: 0xC3CEDE, alpha: 0.4)), lineWidth: 0.7)

        if heat != nil {
            let meltY = 132 - h * 4
            ctx.fill(Art.oval(120, meltY + 1, 32, 5.6), with: .radialGradient(Art.stops([
                (Color(hex: 0xFFFAF0, alpha: Double(0.4 + h * 0.6)), 0),
                (DialInk.accent, 0.35),
                (DialInk.accentDim.opacity(0.7), 1),
            ]), center: CGPoint(x: 116.8, y: meltY - 0.1), startRadius: 0, endRadius: 44.8))
            ctx.fill(Art.oval(114, meltY, 12, 2), with: .color(Color(hex: 0xFFFAF0, alpha: Double(0.15 + h * 0.4))))
            for i in 0..<3 {
                let len = 10 + h * 26
                let x = 106 + CGFloat(i) * 14
                let plume = Path { p in
                    p.move(to: CGPoint(x: x, y: meltY - 4))
                    p.addCurve(to: CGPoint(x: x, y: meltY - 4 - len),
                               control1: CGPoint(x: x - 4, y: meltY - 4 - len * 0.35),
                               control2: CGPoint(x: x + 4, y: meltY - 4 - len * 0.65))
                }
                ctx.stroke(plume, with: .color(DialInk.accent.opacity(Double(0.15 + h * 0.25))),
                           style: StrokeStyle(lineWidth: 0.8, lineCap: .round))
            }
            for i in 0..<4 {
                let p = CGPoint(x: 110 + CGFloat(i) * 7, y: meltY - 6 - CGFloat(i % 2) * 6)
                ctx.fill(Art.circle(p, i % 2 == 1 ? 0.7 : 1), with: .color(Color(hex: 0xFFE9C7)))
            }
        } else {
            Art.text(ctx, "AWAITING HASHRATE", 120, 112)
        }

        // Difficulty epoch orbit, tinted by the expected retarget.
        ctx.stroke(Art.circle(90), with: .color(Color(hex: 0x9FB0C8, alpha: 0.22)),
                   style: StrokeStyle(lineWidth: 0.5, dash: [1, 4]))
        let tone: Color = change.map { $0 >= 0 ? DialInk.up : DialInk.down } ?? DialInk.accent
        if let epoch {
            let o = Art.polar(90, CGFloat(max(0, min(100, epoch)) * 3.6))
            ctx.fill(Art.circle(o, 5.5), with: .color(tone.opacity(0.22)))
            ctx.fill(Art.circle(o, 2.6), with: .color(tone))
        }
        Art.text(ctx, epoch.map { "EPOCH \(Int($0.rounded()))%" } ?? "EPOCH UNAVAILABLE", 120, 190)
        if offline {
            Art.text(ctx, "OFFLINE · LAST KNOWN", 120, 202, color: DialInk.down, spacing: 0.06)
        } else if let change {
            Art.text(ctx, String(format: "NEXT %@%.1f%%", change > 0 ? "+" : "", change), 120, 202, color: tone)
        }

        Art.bezelGlass(ctx)
    }
}

// MARK: - Issuance Hourglass

/// The glass, sand and frame from IssuanceHourglass.tsx, in its 320x240 bench
/// coordinates. The widget lays the readings out as real text beside it, since
/// in-art labels would be too small at medium-widget size.
enum HourglassArt {
    static let cx: CGFloat = 162, top: CGFloat = 46, neck: CGFloat = 122, bot: CGFloat = 198
    /// Just the hourglass, caps and shadow: crop for the medium widget.
    static let viewBox = CGRect(x: 104, y: 32, width: 116, height: 194)

    static var topBulb: Path {
        Path { p in
            p.move(to: CGPoint(x: cx - 34, y: top))
            p.addCurve(to: CGPoint(x: cx - 3.5, y: neck), control1: CGPoint(x: cx - 40, y: top + 34), control2: CGPoint(x: cx - 8, y: neck - 22))
            p.addLine(to: CGPoint(x: cx + 3.5, y: neck))
            p.addCurve(to: CGPoint(x: cx + 34, y: top), control1: CGPoint(x: cx + 8, y: neck - 22), control2: CGPoint(x: cx + 40, y: top + 34))
            p.closeSubpath()
        }
    }

    static var botBulb: Path {
        Path { p in
            p.move(to: CGPoint(x: cx - 3.5, y: neck))
            p.addCurve(to: CGPoint(x: cx - 34, y: bot), control1: CGPoint(x: cx - 8, y: neck + 22), control2: CGPoint(x: cx - 40, y: bot - 34))
            p.addLine(to: CGPoint(x: cx + 34, y: bot))
            p.addCurve(to: CGPoint(x: cx + 3.5, y: neck), control1: CGPoint(x: cx + 40, y: bot - 34), control2: CGPoint(x: cx + 8, y: neck + 22))
            p.closeSubpath()
        }
    }

    static func sand(_ y0: CGFloat, _ y1: CGFloat) -> GraphicsContext.Shading {
        .linearGradient(Art.stops([
            (Color(hex: 0xFFF1DC, alpha: 0.9), 0), (DialInk.accent, 0.18), (DialInk.accentDim, 1),
        ]), startPoint: CGPoint(x: 0, y: y0), endPoint: CGPoint(x: 0, y: y1))
    }

    static func post(_ x0: CGFloat, _ x1: CGFloat) -> GraphicsContext.Shading {
        .linearGradient(Art.stops([
            (Color(hex: 0x4A586E), 0), (Color(hex: 0xC3CEDE, alpha: 0.8), 0.35), (Color(hex: 0x1A2433), 0.6), (Color(hex: 0x0B111B), 1),
        ]), startPoint: CGPoint(x: x0, y: 0), endPoint: CGPoint(x: x1, y: 0))
    }

    /// - Parameter progress: halving epoch elapsed, 0...1, or nil while unknown.
    static func draw(_ ctx: GraphicsContext, progress: Double?) {
        let elapsed = CGFloat(max(0, min(1, progress ?? 0)))
        let known = progress != nil
        let sandTopFull = top + 10, pileFull = neck + 12
        let sandTop = neck - (1 - elapsed) * (neck - sandTopFull)
        let pile = bot - elapsed * (bot - pileFull)

        ctx.fill(Art.oval(cx, 124, 70, 96), with: .radialGradient(Art.stops([
            (DialInk.accent.opacity(0.12), 0), (DialInk.accent.opacity(0), 1),
        ]), center: CGPoint(x: cx, y: 124), startRadius: 0, endRadius: 96))
        ctx.fill(Art.oval(cx, 214, 60, 6), with: .color(.black.opacity(0.35)))

        // Back post.
        ctx.fill(Path(CGRect(x: cx - 2, y: top - 4, width: 4, height: bot - top + 8)), with: .color(Color(hex: 0x0B111B, alpha: 0.8)))

        let dark = GraphicsContext.Shading.color(Color(hex: 0x04070C, alpha: 0.55))
        ctx.fill(topBulb, with: dark)
        ctx.fill(botBulb, with: dark)
        let strata = Color.black.opacity(0.12)

        if known && elapsed < 1 {
            var c = ctx
            c.clip(to: topBulb)
            c.fill(Path(CGRect(x: cx - 44, y: sandTop, width: 88, height: neck - sandTop + 2)), with: sand(sandTop, neck + 2))
            c.fill(Path { p in
                p.move(to: CGPoint(x: cx - 44, y: sandTop))
                p.addQuadCurve(to: CGPoint(x: cx + 44, y: sandTop), control: CGPoint(x: cx, y: sandTop + min(10, (neck - sandTop) * 0.6)))
                p.closeSubpath()
            }, with: dark)
            for k in [CGFloat(0.35), 0.7] {
                let y = sandTop + (neck - sandTop) * k
                c.stroke(Art.line(cx - 44, y, cx + 44, y), with: .color(strata), lineWidth: 0.8)
            }
        }
        if known && elapsed > 0 {
            var c = ctx
            c.clip(to: botBulb)
            c.fill(Path { p in
                p.move(to: CGPoint(x: cx - 46, y: bot + 2))
                p.addLine(to: CGPoint(x: cx - 46, y: pile + 7))
                p.addQuadCurve(to: CGPoint(x: cx, y: pile), control: CGPoint(x: cx - 22, y: pile + 4))
                p.addQuadCurve(to: CGPoint(x: cx + 46, y: pile + 7), control: CGPoint(x: cx + 22, y: pile + 4))
                p.addLine(to: CGPoint(x: cx + 46, y: bot + 2))
                p.closeSubpath()
            }, with: sand(pile, bot + 2))
            for k in [CGFloat(0.4), 0.75] {
                let y = pile + (bot - pile) * k
                c.stroke(Art.line(cx - 46, y, cx + 46, y), with: .color(strata), lineWidth: 0.8)
            }
        }
        if known && elapsed > 0 && elapsed < 1 {
            ctx.stroke(Art.line(cx, neck - 1, cx, pile), with: .color(DialInk.accent.opacity(0.55)),
                       style: StrokeStyle(lineWidth: 0.8, dash: [0.8, 2.2]))
        }

        let glass = GraphicsContext.Shading.linearGradient(Art.stops([
            (Color(hex: 0xDBE6F6, alpha: 0.2), 0), (Color(hex: 0xDBE6F6, alpha: 0.04), 0.22),
            (Color(hex: 0xDBE6F6, alpha: 0.02), 0.8), (Color(hex: 0xDBE6F6, alpha: 0.14), 1),
        ]), startPoint: CGPoint(x: cx - 37, y: 0), endPoint: CGPoint(x: cx + 37, y: 0))
        for bulb in [topBulb, botBulb] {
            ctx.fill(bulb, with: glass)
            ctx.stroke(bulb, with: .color(Color(hex: 0xB4C4DA, alpha: 0.4)), lineWidth: 0.7)
        }
        ctx.stroke(Path { p in
            p.move(to: CGPoint(x: cx - 28, y: top + 8))
            p.addCurve(to: CGPoint(x: cx - 9, y: neck - 14), control1: CGPoint(x: cx - 31, y: top + 30), control2: CGPoint(x: cx - 18, y: neck - 30))
        }, with: .color(Color(hex: 0xF2F7FF, alpha: 0.3)), style: StrokeStyle(lineWidth: 1.6, lineCap: .round))
        ctx.stroke(Path { p in
            p.move(to: CGPoint(x: cx - 10, y: neck + 16))
            p.addCurve(to: CGPoint(x: cx - 28, y: bot - 8), control1: CGPoint(x: cx - 22, y: neck + 34), control2: CGPoint(x: cx - 31, y: bot - 30))
        }, with: .color(Color(hex: 0xF2F7FF, alpha: 0.2)), style: StrokeStyle(lineWidth: 1.4, lineCap: .round))

        // Frame posts and caps.
        for dx in [CGFloat(-46), 46] {
            let x0 = cx + dx - 2.6
            ctx.fill(Path(roundedRect: CGRect(x: x0, y: top - 4, width: 5.2, height: bot - top + 8), cornerRadius: 2), with: post(x0, x0 + 5.2))
            for y in [top + 14, (top + bot) / 2, bot - 14] {
                ctx.fill(Art.oval(cx + dx, y, 4, 2), with: post(cx + dx - 4, cx + dx + 4))
            }
        }
        cap(ctx, top - 6, flip: false)
        cap(ctx, bot + 6, flip: true)
    }

    private static func cap(_ ctx: GraphicsContext, _ y: CGFloat, flip: Bool) {
        ctx.fill(Art.oval(cx, y + (flip ? 3 : -3), 54, 6), with: .color(.black.opacity(0.3)))
        let slab = Path(CGRect(x: cx - 54, y: y - 5, width: 108, height: 10))
        ctx.fill(slab, with: .linearGradient(Art.stops([
            (Color(hex: 0x6C7B92), 0), (Color(hex: 0x232E3E), 0.3), (Color(hex: 0x0E141E), 0.7), (Color(hex: 0x3A4A60), 1),
        ]), startPoint: CGPoint(x: cx - 54, y: y - 5), endPoint: CGPoint(x: cx + 54, y: y + 5)))
        ctx.stroke(slab, with: .color(Color(hex: 0x9AAAC0, alpha: 0.35)), lineWidth: 0.6)
        ctx.stroke(Art.line(cx - 54, y - 5, cx + 54, y - 5), with: .color(Color(hex: 0xEEF3FA, alpha: 0.3)), lineWidth: 0.7)
        ctx.fill(Art.oval(cx, flip ? y - 5 : y + 5, 40, 2.4), with: .color(Color(hex: 0x05080D, alpha: 0.8)))
    }
}
