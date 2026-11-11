package com.chaindials.app.widget;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.DashPathEffect;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;

import java.util.Locale;

/** Hashrate Forge: native port of HashrateForge.tsx (Bitcoin only). */
final class ForgeArt {
    private static final int SEGMENTS = 24;
    private static final float ARC_START = -120, ARC_END = 120;
    private static final int ACCENT_DIM = 0xFFC46E0A;
    private static final int UP = 0xFF3ECF8E;
    private static final int TICKS = 24;

    private ForgeArt() {}

    /**
     * @param heat     0..1 hashrate against the recent range, or null if unknown
     * @param hashrate H/s, shown under the heat scale (the web frame shows it beside the dial)
     * @param epoch    difficulty epoch progress 0..100, or null
     * @param change   expected retarget in percent, or null
     */
    static Bitmap draw(int px, Double heat, Double hashrate, Double epoch, Double change, boolean offline) {
        Bitmap bmp = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        c.scale(px / 240f, px / 240f);
        boolean known = heat != null;
        float h = known ? (float) Math.max(0, Math.min(1, heat)) : 0f;

        DialArt.bezelBack(c, TICKS);

        Paint glow = DialArt.fill(0xFF000000);
        glow.setShader(new RadialGradient(120, 147.2f, 80,
            new int[] {DialArt.alpha(DialArt.ACCENT, .08f + h * .3f), DialArt.alpha(DialArt.ACCENT, h * .08f), DialArt.alpha(DialArt.ACCENT, 0f)},
            new float[] {0, .55f, 1}, Shader.TileMode.CLAMP));
        c.drawCircle(120, 128, 80, glow);

        // Heat scale.
        int lit = Math.round(h * SEGMENTS);
        RectF ring = new RectF(120 - 77, 120 - 77, 120 + 77, 120 + 77);
        for (int i = 0; i < SEGMENTS; i++) {
            float a0 = ARC_START + (i / (float) SEGMENTS) * (ARC_END - ARC_START) + 1.2f;
            float a1 = ARC_START + ((i + 1) / (float) SEGMENTS) * (ARC_END - ARC_START) - 1.2f;
            boolean on = i < lit;
            float t = i / (float) (SEGMENTS - 1);
            int col = on ? DialArt.alpha(t > .85f ? 0xFFFFF1D8 : DialArt.ACCENT, .45f + t * .55f) : 0xFF1B2534;
            c.drawArc(ring, a0 - 90, a1 - a0, false, DialArt.strokePaint(col, 6));
        }
        String[] marks = {"LOW", "MID", "HIGH"};
        float[] at = {ARC_START, 0, ARC_END};
        for (int i = 0; i < 3; i++) {
            float[] p = DialArt.polar(64, at[i]);
            DialArt.text(c, marks[i], p[0], p[1] + 2.5f, DialArt.TINY_SIZE, DialArt.TINY, .1f, 1f);
        }
        DialArt.text(c, "HEAT VS RECENT RANGE", 120, 80, DialArt.TINY_SIZE, DialArt.TINY, .1f, 1f);
        if (hashrate != null) {
            DialArt.text(c, formatHashrate(hashrate), 120, 100, 12f, DialArt.LABEL, .06f, 1f);
        }

        // Crucible.
        c.drawOval(new RectF(80, 165, 160, 177), DialArt.fill(DialArt.alpha(0xFF000000, .4f)));
        Path body = new Path();
        body.moveTo(84, 128); body.lineTo(92, 164);
        body.cubicTo(96, 172, 144, 172, 148, 164);
        body.lineTo(156, 128); body.close();
        Paint iron = DialArt.fill(0xFF000000);
        iron.setShader(new LinearGradient(84, 128, 156, 170,
            new int[] {0xFF7D8CA3, 0xFF253042, 0xFF0C121B, 0xFF3B4A5F}, new float[] {0, .28f, .72f, 1}, Shader.TileMode.CLAMP));
        c.drawPath(body, iron);
        c.drawPath(body, DialArt.strokePaint(DialArt.alpha(0xFFA9B8CC, .35f), .6f));
        Paint shine = DialArt.strokePaint(DialArt.alpha(0xFFE8EEF8, .2f), 1.2f);
        shine.setStrokeCap(Paint.Cap.ROUND);
        c.drawLine(90, 136, 96, 162, shine);
        for (int i = 0; i < 3; i++) {
            c.drawLine(87 + i * .6f, 140 + i * 9, 153 - i * .6f, 140 + i * 9, DialArt.strokePaint(DialArt.alpha(0xFF000000, .35f), .7f));
        }
        RectF mouth = new RectF(84, 121, 156, 135);
        c.drawOval(mouth, DialArt.fill(0xFF05080D));
        c.drawOval(mouth, DialArt.strokePaint(DialArt.alpha(0xFFC3CEDE, .4f), .7f));

        if (known) {
            float meltY = 132 - h * 4;
            Paint melt = DialArt.fill(0xFF000000);
            melt.setShader(new RadialGradient(116.8f, meltY - 4.6f + 4.5f, 44.8f,
                new int[] {DialArt.alpha(0xFFFFFAF0, .4f + h * .6f), DialArt.ACCENT, DialArt.alpha(ACCENT_DIM, .7f)},
                new float[] {0, .35f, 1}, Shader.TileMode.CLAMP));
            c.drawOval(new RectF(88, meltY + 1 - 5.6f, 152, meltY + 1 + 5.6f), melt);
            c.drawOval(new RectF(102, meltY - 2, 126, meltY + 2), DialArt.fill(DialArt.alpha(0xFFFFFAF0, .15f + h * .4f)));
            Paint plume = DialArt.strokePaint(DialArt.alpha(DialArt.ACCENT, .15f + h * .25f), .8f);
            plume.setStrokeCap(Paint.Cap.ROUND);
            for (int i = 0; i < 3; i++) {
                float len = 10 + h * 26;
                float x = 106 + i * 14;
                Path p = new Path();
                p.moveTo(x, meltY - 4);
                p.cubicTo(x - 4, meltY - 4 - len * .35f, x + 4, meltY - 4 - len * .65f, x, meltY - 4 - len);
                c.drawPath(p, plume);
            }
            for (int i = 0; i < 4; i++) {
                c.drawCircle(110 + i * 7, meltY - 6 - (i % 2) * 6, i % 2 == 1 ? .7f : 1f, DialArt.fill(0xFFFFE9C7));
            }
        } else {
            DialArt.text(c, "AWAITING HASHRATE", 120, 112, DialArt.TINY_SIZE, DialArt.TINY, .1f, 1f);
        }

        // Difficulty epoch orbit.
        Paint orbitLine = DialArt.strokePaint(DialArt.alpha(0xFF9FB0C8, .22f), .5f);
        orbitLine.setPathEffect(new DashPathEffect(new float[] {1, 4}, 0));
        c.drawCircle(120, 120, 90, orbitLine);
        int tone = change == null ? DialArt.ACCENT : change >= 0 ? UP : DialArt.DOWN;
        if (epoch != null) {
            float[] o = DialArt.polar(90, (float) (Math.max(0, Math.min(100, epoch)) * 3.6));
            c.drawCircle(o[0], o[1], 5.5f, DialArt.fill(DialArt.alpha(tone, .22f)));
            c.drawCircle(o[0], o[1], 2.6f, DialArt.fill(tone));
        }
        DialArt.text(c, epoch != null ? "EPOCH " + Math.round(epoch) + "%" : "EPOCH UNAVAILABLE",
            120, 190, DialArt.TINY_SIZE, DialArt.TINY, .1f, 1f);
        if (offline) {
            DialArt.text(c, "OFFLINE · LAST KNOWN", 120, 201, DialArt.TINY_SIZE, DialArt.DOWN, .1f, 1f);
        } else if (change != null) {
            DialArt.text(c, "NEXT " + String.format(Locale.US, "%s%.1f%%", change > 0 ? "+" : "", change),
                120, 201, DialArt.TINY_SIZE, tone, .1f, 1f);
        }

        DialArt.bezelGlass(c);
        return bmp;
    }

    /** formatHashrate() from src/lib/format.ts. */
    static String formatHashrate(double hps) {
        double eh = hps / 1e18;
        if (eh >= 1) return String.format(Locale.US, "%.1f EH/s", eh);
        return String.format(Locale.US, "%.1f PH/s", hps / 1e15);
    }
}
