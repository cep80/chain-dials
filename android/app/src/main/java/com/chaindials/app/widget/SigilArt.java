package com.chaindials.app.widget;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.DashPathEffect;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Block Sigil: native port of TipSigil.tsx. The glyph geometry is a line-for-line
 * copy of buildSigil() in src/lib/hash-sigil.ts so a block looks identical on
 * the board and on the home screen.
 */
final class SigilArt {
    private static final int METAL = 0xFFD6DEEA;
    /** Mobile tier: 48 requested ticks halve to 24. */
    private static final int TICKS = 24;
    private static final float GLYPH_SCALE = 1.1f;

    private SigilArt() {}

    static final class Segment {
        String type;
        float x1, y1, x2, y2, r, start, end, weight;
        boolean accent;
    }

    static final class Geometry {
        final List<Segment> segments = new ArrayList<>();
        final List<Float> rings = new ArrayList<>();
    }

    static Bitmap draw(int px, String hash, Long height) {
        Bitmap bmp = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        c.scale(px / 240f, px / 240f);

        DialArt.bezelBack(c, TICKS);

        Paint plate = DialArt.fill(0xFF000000);
        plate.setShader(new RadialGradient(103.2f, 86.4f, 126,
            new int[] {0xFF1B2433, 0xFF0A1019, 0xFF05080D}, new float[] {0, .6f, 1}, Shader.TileMode.CLAMP));
        c.drawCircle(120, 120, 84, plate);
        c.drawCircle(120, 120, 84, DialArt.strokePaint(0xFF02050A, 1.2f));
        c.drawCircle(120, 120, 83, DialArt.strokePaint(DialArt.alpha(0xFFCFDCF0, .12f), .6f));
        Paint glow = DialArt.fill(0xFF000000);
        glow.setShader(new RadialGradient(120, 120, 80,
            DialArt.alpha(DialArt.ACCENT, .16f), DialArt.alpha(DialArt.ACCENT, 0f), Shader.TileMode.CLAMP));
        c.drawCircle(120, 120, 80, glow);

        if (hash != null) {
            String clean = clean(hash);
            // Outer ring: all 64 digits as tick lengths, so no byte is dropped.
            for (int i = 0; i < 64; i++) {
                int n = Character.digit(clean.charAt(i), 16);
                float[] a = DialArt.polar(88.5f, i * 360f / 64);
                float[] b = DialArt.polar(88.5f + 1.6f + n * .42f, i * 360f / 64);
                Paint p = DialArt.strokePaint(n > 11 ? DialArt.alpha(DialArt.ACCENT, .95f)
                    : DialArt.alpha(0xFF9FB0C8, .35f + n / 40f), 1.1f);
                p.setStrokeCap(Paint.Cap.ROUND);
                c.drawLine(a[0], a[1], b[0], b[1], p);
            }

            Geometry g = build(clean, 120);
            c.save();
            // The web places the glyph at scale 1.42; the widget shrinks it to leave
            // room for captions that say what it is (block above, hash below).
            c.translate(120, 120);
            c.scale(GLYPH_SCALE, GLYPH_SCALE);
            c.translate(-60, -60);
            engrave(c, g, false);
            engrave(c, g, true);
            c.restore();
        } else {
            Paint dash = DialArt.strokePaint(DialArt.alpha(0xFF9FB0C8, .3f), .6f);
            dash.setPathEffect(new DashPathEffect(new float[] {2, 4}, 0));
            c.drawCircle(120, 120, 52, dash);
            DialArt.text(c, "AWAITING BLOCK", 120, 123, DialArt.TINY_SIZE, DialArt.TINY, .12f, 1f);
        }

        // Captions sit inside the plate, clear of the digit ring and the bezel ticks.
        DialArt.text(c, "BLOCK", 120, 50, DialArt.TINY_SIZE, DialArt.TINY, .14f, 1f);
        DialArt.text(c, height != null ? "#" + NumberFormat.getIntegerInstance(Locale.US).format(height) : "—",
            120, 63, 12f, DialArt.LABEL, .08f, 1f);
        if (hash != null) {
            String tail = clean(hash);
            DialArt.text(c, "HASH …" + tail.substring(56), 120, 196, DialArt.TINY_SIZE, DialArt.TINY, .1f, 1f);
        }

        DialArt.bezelGlass(c);
        return bmp;
    }

    /** Each stroke is cut twice: a shadow offset away from the key light, then the lit metal. */
    private static void engrave(Canvas c, Geometry g, boolean lit) {
        c.save();
        if (!lit) c.translate(.35f, .5f);
        int shade = 0xFF000000;
        for (float r : g.rings) {
            c.drawCircle(60, 60, r, DialArt.strokePaint(lit ? DialArt.alpha(0xFF7C8CA6, .45f) : DialArt.alpha(shade, .4f), .45f));
        }
        for (Segment s : g.segments) {
            int base = lit ? (s.accent ? DialArt.ACCENT : METAL) : shade;
            switch (s.type) {
                case "line":
                case "chord": {
                    float op = lit ? (s.type.equals("chord") ? .7f : .92f) : .55f;
                    Paint p = DialArt.strokePaint(DialArt.alpha(base, op), s.weight * .8f);
                    p.setStrokeCap(Paint.Cap.ROUND);
                    c.drawLine(s.x1, s.y1, s.x2, s.y2, p);
                    break;
                }
                case "arc": {
                    Paint p = DialArt.strokePaint(DialArt.alpha(base, lit ? .95f : .55f), s.weight * .95f);
                    p.setStrokeCap(Paint.Cap.ROUND);
                    RectF box = new RectF(s.x1 - s.r, s.y1 - s.r, s.x1 + s.r, s.y1 + s.r);
                    c.drawArc(box, (float) Math.toDegrees(s.start), (float) Math.toDegrees(s.end - s.start), false, p);
                    break;
                }
                default: // dot
                    c.drawCircle(s.x1, s.y1, s.r * .85f, DialArt.fill(DialArt.alpha(base, lit ? 1f : .55f)));
            }
        }
        c.restore();
    }

    static String clean(String hash) {
        String h = hash.replaceFirst("^(0x|0X)", "").toLowerCase(Locale.US);
        StringBuilder b = new StringBuilder(h);
        while (b.length() < 64) b.append('0');
        String out = b.substring(0, 64);
        return out.matches("[0-9a-f]{64}") ? out : out.replaceAll("[^0-9a-f]", "0");
    }

    private static int nibble(String hex, int i) {
        return Character.digit(hex.charAt(i % hex.length()), 16);
    }

    private static int pair(String hex, int i) {
        return (nibble(hex, i) << 4) | nibble(hex, i + 1);
    }

    /** buildSigil() from src/lib/hash-sigil.ts. */
    static Geometry build(String clean, float size) {
        Geometry g = new Geometry();
        float cx = size / 2, cy = size / 2;

        int ringCount = 2 + (nibble(clean, 0) % 3);
        for (int i = 0; i < ringCount; i++) {
            g.rings.add(size * (0.18f + i * 0.14f + (nibble(clean, 2 + i) / 16f) * 0.04f));
        }
        float last = g.rings.get(g.rings.size() - 1);

        int spokeCount = 6 + (nibble(clean, 8) % 7);
        for (int i = 0; i < spokeCount; i++) {
            double angle = ((pair(clean, 10 + i * 2) / 255.0) * Math.PI * 2 + i) % (Math.PI * 2);
            double len = last * (0.55 + (nibble(clean, 20 + i) / 16.0) * 0.45);
            Segment s = new Segment();
            s.type = "line";
            s.x1 = cx; s.y1 = cy;
            s.x2 = (float) (cx + Math.cos(angle) * len);
            s.y2 = (float) (cy + Math.sin(angle) * len);
            s.weight = 0.8f + (nibble(clean, 30 + i) % 3) * 0.4f;
            s.accent = nibble(clean, 40 + i) > 11;
            g.segments.add(s);
        }

        for (int i = 0; i < g.rings.size(); i++) {
            double start = (pair(clean, 48 + i * 2) / 255.0) * Math.PI * 2;
            double sweep = (0.4 + nibble(clean, 54 + i) / 16.0) * Math.PI;
            Segment s = new Segment();
            s.type = "arc";
            s.x1 = cx; s.y1 = cy;
            s.r = g.rings.get(i);
            s.start = (float) start;
            s.end = (float) (start + sweep);
            s.weight = 1.2f + (i % 2) * 0.5f;
            s.accent = i == g.rings.size() - 1;
            g.segments.add(s);
        }

        for (int i = 0; i < 4; i++) {
            double a1 = (pair(clean, 56 + i) / 255.0) * Math.PI * 2;
            double a2 = a1 + Math.PI * (0.3 + nibble(clean, 60 + i) / 32.0);
            Segment s = new Segment();
            s.type = "chord";
            s.x1 = (float) (cx + Math.cos(a1) * last * 0.85);
            s.y1 = (float) (cy + Math.sin(a1) * last * 0.85);
            s.x2 = (float) (cx + Math.cos(a2) * last * 0.85);
            s.y2 = (float) (cy + Math.sin(a2) * last * 0.85);
            s.weight = 0.7f;
            s.accent = nibble(clean, 62 + i) > 12;
            g.segments.add(s);
        }

        for (int i = 0; i < 3; i++) {
            double a = (i / 3.0) * Math.PI * 2 + nibble(clean, i) / 16.0;
            double d = size * (0.06 + (nibble(clean, 5 + i) / 16.0) * 0.05);
            Segment s = new Segment();
            s.type = "dot";
            s.x1 = (float) (cx + Math.cos(a) * d);
            s.y1 = (float) (cy + Math.sin(a) * d);
            s.r = 1.2f + (nibble(clean, 7 + i) % 3) * 0.6f;
            s.weight = 1;
            s.accent = i == 0;
            g.segments.add(s);
        }
        return g;
    }
}
