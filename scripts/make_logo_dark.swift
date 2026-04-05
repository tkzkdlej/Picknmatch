import AppKit
import Foundation

struct RGBA {
    var r: Double
    var g: Double
    var b: Double
    var a: Double
}

func clamp(_ v: Double, _ lo: Double = 0, _ hi: Double = 255) -> Double {
    min(hi, max(lo, v))
}

func distance(_ r: Double, _ g: Double, _ b: Double, to bg: RGBA) -> Double {
    let dr = r - bg.r
    let dg = g - bg.g
    let db = b - bg.b
    return sqrt(dr * dr + dg * dg + db * db)
}

func sampleBackground(_ data: UnsafeMutablePointer<UInt8>, _ w: Int, _ h: Int) -> RGBA {
    var samples: [(Double, Double, Double)] = []
    let corners = [
        (0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
        (w / 2, 0), (w / 2, h - 1), (0, h / 2), (w - 1, h / 2)
    ]
    for (cx, cy) in corners {
        for oy in -1...1 {
            for ox in -1...1 {
                let x = min(max(0, cx + ox), w - 1)
                let y = min(max(0, cy + oy), h - 1)
                let i = (y * w + x) * 4
                samples.append((Double(data[i]), Double(data[i + 1]), Double(data[i + 2])))
            }
        }
    }
    let r = samples.map(\.0).reduce(0, +) / Double(samples.count)
    let g = samples.map(\.1).reduce(0, +) / Double(samples.count)
    let b = samples.map(\.2).reduce(0, +) / Double(samples.count)
    return RGBA(r: r, g: g, b: b, a: 255)
}

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let inputURL = root.appendingPathComponent("images/logo-source-official.png")
let outputURL = root.appendingPathComponent("images/logo-dark.png")

guard let source = NSImage(contentsOf: inputURL) else {
    fputs("failed to load source\n", stderr)
    exit(1)
}

let inSize = source.size
let scale = 3
let width = Int(round(inSize.width)) * scale
let height = Int(round(inSize.height)) * scale

guard let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: width,
    pixelsHigh: height,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: width * 4,
    bitsPerPixel: 32
), let ctx = NSGraphicsContext(bitmapImageRep: rep) else {
    fputs("failed to create bitmap\n", stderr)
    exit(1)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = ctx
ctx.cgContext.interpolationQuality = .high
NSColor.clear.setFill()
NSRect(x: 0, y: 0, width: width, height: height).fill()
source.draw(in: NSRect(x: 0, y: 0, width: width, height: height), from: .zero, operation: .copy, fraction: 1)
NSGraphicsContext.restoreGraphicsState()

guard let data = rep.bitmapData else {
    fputs("missing bitmap data\n", stderr)
    exit(1)
}

let bg = sampleBackground(data, width, height)
let goldTarget = RGBA(r: 214, g: 188, b: 136, a: 255)
let textTarget = RGBA(r: 244, g: 247, b: 251, a: 255)

for y in 0..<height {
    for x in 0..<width {
        let i = (y * width + x) * 4
        let r = Double(data[i])
        let g = Double(data[i + 1])
        let b = Double(data[i + 2])

        let maxv = max(r, g, b)
        let minv = min(r, g, b)
        let chroma = maxv - minv
        let lum = (r + g + b) / 3
        let dist = distance(r, g, b, to: bg)

        var alpha = (dist - 12) / 34
        if lum > 205 && chroma < 22 { alpha *= 0.25 }
        if lum > 190 && chroma < 16 { alpha *= 0.12 }
        if lum > 175 && chroma < 12 { alpha *= 0.06 }
        if dist > 46 || lum < 150 || chroma > 32 { alpha = max(alpha, 0.98) }
        alpha = min(1, max(0, alpha))

        if alpha < 0.015 {
            data[i] = 0
            data[i + 1] = 0
            data[i + 2] = 0
            data[i + 3] = 0
            continue
        }

        // Decontaminate from the sampled paper background.
        let pr = clamp((r - bg.r * (1 - alpha)) / alpha)
        let pg = clamp((g - bg.g * (1 - alpha)) / alpha)
        let pb = clamp((b - bg.b * (1 - alpha)) / alpha)

        let monogramZone = Double(x) < Double(width) * 0.29
        let isGold = monogramZone && pr > pb + 8 && pg > pb && pr > 105
        let target = isGold ? goldTarget : textTarget

        // Preserve shape contrast while forcing cleaner dark-surface colors.
        let detail = min(1, max(0, (255 - ((pr + pg + pb) / 3)) / 255))
        let mix = isGold ? 0.9 : 0.97
        let nr = clamp(pr * (1 - mix) + target.r * mix + detail * (isGold ? 4 : 0))
        let ng = clamp(pg * (1 - mix) + target.g * mix + detail * (isGold ? 3 : 0))
        let nb = clamp(pb * (1 - mix) + target.b * mix)

        data[i] = UInt8(nr.rounded())
        data[i + 1] = UInt8(ng.rounded())
        data[i + 2] = UInt8(nb.rounded())
        data[i + 3] = UInt8((alpha * 255).rounded())
    }
}

var minX = width
var minY = height
var maxX = -1
var maxY = -1
for y in 0..<height {
    for x in 0..<width {
        let i = (y * width + x) * 4
        if data[i + 3] > 5 {
            minX = min(minX, x)
            minY = min(minY, y)
            maxX = max(maxX, x)
            maxY = max(maxY, y)
        }
    }
}

guard maxX >= minX, maxY >= minY, let cg = rep.cgImage?.cropping(to: CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)) else {
    fputs("failed to crop result\n", stderr)
    exit(1)
}

let out = NSBitmapImageRep(cgImage: cg)
guard let png = out.representation(using: .png, properties: [:]) else {
    fputs("failed to encode png\n", stderr)
    exit(1)
}

try png.write(to: outputURL)
print(outputURL.path)
