// Renders the iOS dial widget art to PNGs on a macOS CI runner, so the
// SwiftUI drawing can be checked without a Mac at hand.
//
//   swiftc -parse-as-library ios/App/ChainDialsWidget/DialArt.swift \
//     scripts/ios-widget-snapshots/Render.swift -o render && ./render snapshots

import AppKit
import SwiftUI

private let hash = "00000000000000000000efc9bc464f716534f5e7b00f23d9b6c228664db21678"
private let ink = Color(hex: 0x0A0C10)

/// A small-widget tile: dark ground, the dial inset like DialWidgets.dialFace().
struct Tile<Art: View>: View {
    @ViewBuilder let art: () -> Art
    var body: some View {
        art()
            .padding(6)
            .frame(width: 170, height: 170)
            .background(ink)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}

@main
struct Render {
    @MainActor
    static func main() throws {
        let dir = URL(fileURLWithPath: CommandLine.arguments.dropFirst().first ?? "snapshots")
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

        save(Tile { ArtCanvas { MetronomeArt.draw($0, since: 252, height: 975_460, offline: false, drawReading: true) } },
             "metronome-calm", dir)
        save(Tile { ArtCanvas { MetronomeArt.draw($0, since: 1_530, height: 975_460, offline: false, drawReading: true) } },
             "metronome-late", dir)
        save(Tile { ArtCanvas { SigilArt.draw($0, hash: hash, height: 975_460) } }, "sigil", dir)
        save(Tile { ArtCanvas { ForgeArt.draw($0, heat: 0.35, rate: 954.8e18, epoch: 85.7, change: -7.1, offline: false) } },
             "forge", dir)
        save(
            ArtCanvas(viewBox: HourglassArt.viewBox) { HourglassArt.draw($0, progress: 0.645) }
                .frame(width: 80, height: 134)
                .padding(12)
                .background(ink),
            "hourglass-glass", dir
        )
        save(Tile { ArtCanvas { MetronomeArt.draw($0, since: nil, height: nil, offline: false, drawReading: true) } },
             "metronome-waiting", dir)
    }

    @MainActor
    static func save<V: View>(_ view: V, _ name: String, _ dir: URL) {
        let renderer = ImageRenderer(content: view)
        renderer.scale = 3
        guard let image = renderer.cgImage,
              let png = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:]) else {
            FileHandle.standardError.write("render failed: \(name)\n".data(using: .utf8)!)
            exit(1)
        }
        do {
            try png.write(to: dir.appendingPathComponent("\(name).png"))
            print("wrote \(name).png")
        } catch {
            FileHandle.standardError.write("write failed: \(name): \(error)\n".data(using: .utf8)!)
            exit(1)
        }
    }
}
