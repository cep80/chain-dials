package com.chaindials.app.widget;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.Shader;
import android.graphics.Typeface;

import java.text.NumberFormat;
import java.util.Locale;

/**
 * Native port of the web dials (src/components/viz/DialPrimitives.tsx and
 * BlockMetronome.tsx). Everything is drawn in the same 240-unit viewBox as the
 * SVG so coordinates can be copied across one for one.
 */
final class DialArt {
    static final int ACCENT = 0xFFF7931A;
    static final int WARN = 0xFFE6B84D;
    static final int DOWN = 0xFFFF5C5C;
    static final int TINY = 0xFF93A7C9;
    static final int LABEL = 0xFFF3F6FB;

    /** Widgets sit much smaller than the web dial, so small type gets a lift to stay readable. */
    static final float TINY_SIZE = 8.2f;
    private static final float NUMERAL_SIZE = 9.6f;
    static final float READING_SIZE = 15f;
    /** Baseline of the reading, in viewBox units; the widget overlays a ticking Chronometer here. */
    static final float READING_BASELINE = 164f;

    /** Matches the mobile quality tier: 40 requested ticks halve to 20. */
    private static final int METRONOME_TICKS = 20;

    private DialArt() {}

    enum Tone { CALM, LATE, STALE }

    /** Same thresholds as metronomeTone() in src/lib/viz-scale.ts. */
    static Tone metronomeTone(Double since, double target) {
        if (since == null) return Tone.CALM;
        if (since > target * 2) return Tone.STALE;
        if (since > target * 1.2) return Tone.LATE;
        return Tone.CALM;
    }

    static int toneColor(Tone t) {
        switch (t) {
            case LATE: return WARN;
            case STALE: return DOWN;
            default: return ACCENT;
        }
    }

    /**
     * @param sinceSeconds time since the tip, or null while waiting for data
     * @param offline      last-known reading: hand dims and the note says so
     * @param drawReading  false when the caller overlays a live clock instead
     */
    static Bitmap metronome(int px, Double sinceSeconds, Long height, double target,
                            boolean offline, boolean drawReading) {
        Bitmap bmp = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        c.scale(px / 240f, px / 240f);

        Tone tone = offline ? Tone.CALM : metronomeTone(sinceSeconds, target);
        int stroke = toneColor(tone);
        double raw = sinceSeconds == null ? 0 : sinceSeconds / target;
        int laps = (int) Math.floor(raw);
        float angle = sinceSeconds == null ? 0f : (float) (raw * 360.0);
        String targetLabel = Math.round(target / 60) + " MIN";

        bezelBack(c, METRONOME_TICKS);

        if (tone != Tone.CALM) {
            Paint glow = fill(0xFF000000); // opaque base: the shader is modulated by the paint alpha
            glow.setShader(new RadialGradient(120, 120, 102,
                alpha(stroke, tone == Tone.LATE ? .14f : .2f), alpha(stroke, 0f), Shader.TileMode.CLAMP));
            c.drawCircle(120, 120, 102, glow);
        }

        // The expected window: one lap, a soft band from 0 to the target.
        c.drawCircle(120, 120, 88, strokePaint(alpha(stroke, .08f), 5));

        for (int i = 0; i < 10; i++) {
            float[] p = polar(80, i * 36);
            double v = target * i / 10;
            String n = trim(target >= 60 ? v / 60 : v);
            if (i == 0) text(c, n, p[0], p[1] + 3.2f, 11f, LABEL, .1f, 1f);
            else text(c, n, p[0], p[1] + 3f, NUMERAL_SIZE, TINY, .1f, 1f);
        }
        text(c, (target >= 60 ? "MIN" : "S") + " SINCE BLOCK", 120, 99, TINY_SIZE, TINY, .12f, 1f);

        // Overdue laps become studs on the bezel.
        for (int i = 0; i < Math.min(12, laps); i++) {
            float[] p = polar(108.5f, i * 9 + 4.5f);
            c.drawCircle(p[0], p[1], 2.9f, fill(alpha(stroke, .22f)));
            c.drawCircle(p[0], p[1], 1.6f, fill(stroke));
        }

        if (sinceSeconds != null) {
            int handAlpha = offline ? 115 : 255;
            c.saveLayerAlpha(0, 0, 240, 240, handAlpha);

            // Contact shadow follows the key light (LIGHT_RIG.shadow, dy 3).
            c.save();
            c.translate(1.8f, 3f);
            c.rotate(angle, 120, 120);
            Path shadow = new Path();
            shadow.moveTo(118.4f, 142); shadow.lineTo(119.4f, 40); shadow.lineTo(120.6f, 40); shadow.lineTo(121.6f, 142); shadow.close();
            c.drawPath(shadow, fill(alpha(Color.BLACK, .45f)));
            c.restore();

            c.save();
            c.rotate(angle, 120, 120);
            Path hand = new Path();
            hand.moveTo(117.2f, 144); hand.lineTo(119.3f, 40); hand.lineTo(120.7f, 40); hand.lineTo(122.8f, 144); hand.close();
            Paint handPaint = fill(0xFF000000); // opaque base: the shader is modulated by the paint alpha
            handPaint.setShader(new LinearGradient(117.2f, 0, 122.8f, 0,
                new int[] {0xFFF6F9FF, 0xFFDBE5F3, 0xFF8D9DB5}, new float[] {0, .5f, 1}, Shader.TileMode.CLAMP));
            c.drawPath(hand, handPaint);
            c.drawLine(120, 44, 120, 102, strokePaint(stroke, 1.3f));
            c.drawCircle(120, 140, 4.6f, fill(0xFF1A2433));
            c.drawCircle(120, 140, 4.6f, strokePaint(0xFF8D9DB5, .6f));
            c.drawCircle(120, 44, 2.2f, fill(stroke));
            c.restore();

            c.restore();
        }

        Paint hub = fill(0xFF000000); // opaque base: the shader is modulated by the paint alpha
        hub.setShader(new RadialGradient(117.96f, 116.94f, 11.9f,
            new int[] {0xFFF2F6FC, 0xFF8899B1, 0xFF1A2433}, new float[] {0, .45f, 1}, Shader.TileMode.CLAMP));
        c.drawCircle(120, 120, 8.5f, hub);
        c.drawCircle(120, 120, 8.5f, strokePaint(0xFF02050A, .8f));
        c.drawCircle(120, 120, 2.4f, fill(stroke));

        if (sinceSeconds == null) {
            text(c, "AWAITING TIP", 120, READING_BASELINE, 11f, LABEL, .1f, 1f);
        } else if (drawReading) {
            text(c, duration(sinceSeconds), 120, READING_BASELINE, READING_SIZE, LABEL, .08f, 1f);
        }

        String note = offline ? "OFFLINE · LAST KNOWN"
            : laps > 0 ? "+" + laps + " LAP" + (laps == 1 ? "" : "S") + " OVER " + targetLabel
            : "TARGET " + targetLabel;
        text(c, note, 120, 180, TINY_SIZE, offline ? DOWN : tone == Tone.CALM ? TINY : stroke, .12f, 1f);
        if (height != null) {
            text(c, "#" + NumberFormat.getIntegerInstance(Locale.US).format(height), 120, 192, TINY_SIZE, TINY, .12f, .7f);
        }

        bezelGlass(c);
        return bmp;
    }

    /** DialBezel up to its children: shadow, metal rim, lit face, tick ring, screws. */
    static void bezelBack(Canvas c, int ticks) {
        c.drawCircle(120, 123, 112, fill(alpha(Color.BLACK, .35f)));

        Paint metal = fill(0xFF000000); // opaque base: the shader is modulated by the paint alpha
        metal.setShader(new LinearGradient(9, 9, 231, 231,
            new int[] {alpha(0xFFC3CEDE, .48f), 0xFF17212F, 0xFF080F19, alpha(0xFF6E8098, .45f), 0xFF0B111B},
            new float[] {0, .24f, .51f, .77f, 1}, Shader.TileMode.CLAMP));
        c.drawCircle(120, 120, 111, metal);
        c.drawCircle(120, 120, 111, strokePaint(alpha(0xFFA4B9D2, .2f), .6f));

        c.drawCircle(120, 120, 106, fill(0xFF0B131F));
        Paint face = fill(0xFF000000); // opaque base: the shader is modulated by the paint alpha
        // Key light up and to the left (LIGHT_RIG.key 40% / 30% of the face box).
        face.setShader(new RadialGradient(98.8f, 77.6f, 159,
            new int[] {alpha(ACCENT, .16f), alpha(0xFF0B131F, 0f), alpha(0xFF050910, .92f)},
            new float[] {0, .55f, 1}, Shader.TileMode.CLAMP));
        c.drawCircle(120, 120, 106, face);
        c.drawCircle(120, 120, 106, strokePaint(0xFF02050A, 2));
        c.drawCircle(120, 120, 103, strokePaint(alpha(0xFFCFDDF0, .15f), .5f));
        c.drawCircle(120, 120, 77, strokePaint(alpha(ACCENT, .1f), .5f));

        for (int i = 0; i < ticks; i++) {
            boolean major = i % 4 == 0;
            float deg = i * 360f / ticks;
            float[] a = polar(major ? 94 : 98, deg);
            float[] b = polar(101, deg);
            Paint p = strokePaint(major ? alpha(0xFFB7C7DF, .8f) : alpha(0xFF53627A, .65f), major ? 1f : .65f);
            c.drawLine(a[0], a[1], b[0], b[1], p);
        }

        for (int deg = 45; deg < 360; deg += 90) {
            float[] p = polar(109, deg);
            c.drawCircle(p[0], p[1], 1.2f, fill(0xFF070C14));
            c.drawLine(p[0] - .7f, p[1], p[0] + .7f, p[1], strokePaint(0xFF8290A5, .5f));
        }
    }

    /** The glass sheen laid over everything inside the bezel. */
    static void bezelGlass(Canvas c) {
        Paint glass = fill(0xFF000000); // opaque base: the shader is modulated by the paint alpha
        // x2 .7, y2 1 of the glass circle's box (18..222).
        glass.setShader(new LinearGradient(18, 18, 18 + .7f * 204, 222,
            new int[] {alpha(0xFFE6F0FF, .09f), alpha(0xFFE6F0FF, 0f), alpha(ACCENT, .04f)},
            new float[] {0, .5f, 1}, Shader.TileMode.CLAMP));
        c.drawCircle(120, 120, 102, glass);
    }

    /** Same convention as polar() in DialPrimitives: 0° is twelve o'clock. */
    static float[] polar(float radius, float degrees) {
        double a = Math.toRadians(degrees - 90);
        return new float[] {(float) (120 + Math.cos(a) * radius), (float) (120 + Math.sin(a) * radius)};
    }

    /** formatDuration() from src/lib/format.ts. */
    static String duration(double seconds) {
        long s = Math.max(0, (long) Math.floor(seconds));
        long h = s / 3600, m = (s % 3600) / 60, sec = s % 60;
        if (h > 0) return String.format(Locale.US, "%d:%02d:%02d", h, m, sec);
        return String.format(Locale.US, "%d:%02d", m, sec);
    }

    private static String trim(double v) {
        double r = Math.round(v * 10) / 10.0;
        return r == Math.rint(r) ? String.valueOf((long) r) : String.valueOf(r);
    }

    static void text(Canvas c, String s, float x, float y, float size, int color, float spacing, float opacity) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
        p.setTypeface(Typeface.MONOSPACE);
        p.setTextSize(size);
        p.setLetterSpacing(spacing);
        p.setTextAlign(Paint.Align.CENTER);
        p.setColor(alpha(color, opacity * Color.alpha(color) / 255f));
        c.drawText(s, x, y, p);
    }

    static Paint fill(int color) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.FILL);
        p.setColor(color);
        return p;
    }

    static Paint strokePaint(int color, float width) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(width);
        p.setColor(color);
        return p;
    }

    static int alpha(int color, float opacity) {
        int a = Math.round(Math.max(0, Math.min(1, opacity)) * 255);
        return (color & 0x00FFFFFF) | (a << 24);
    }
}
