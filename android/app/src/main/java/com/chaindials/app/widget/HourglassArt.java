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
import android.graphics.Typeface;

import java.text.NumberFormat;
import java.util.Locale;

/**
 * Issuance Hourglass: native port of IssuanceHourglass.tsx. Same wide 320x240
 * bench, same coordinates; sand in the lower bulb is the halving epoch, the
 * tube on the right is the share of 21M issued.
 */
final class HourglassArt {
    static final float W = 320, H = 240;
    private static final float CX = 162, TOP = 46, NECK = 122, BOT = 198;
    private static final float SAND_TOP_FULL = TOP + 10, PILE_FULL = NECK + 12;
    private static final float GAUGE_X = 262, GAUGE_TOP = 50, GAUGE_BOT = 196;
    private static final int ACCENT_DIM = 0xFFC46E0A;
    private static final int PAPER = 0xFFF3EFE6;
    private static final float TINY = 7.8f;

    private HourglassArt() {}

    /**
     * @param progress  halving epoch elapsed, 0..1, or null
     * @param blocksLeft blocks to the next halving, or null
     * @param issuedPct share of 21M issued, 0..100, or null
     */
    static Bitmap draw(int pxW, Double progress, Long blocksLeft, Double issuedPct, boolean offline) {
        int pxH = Math.round(pxW * H / W);
        Bitmap bmp = Bitmap.createBitmap(pxW, pxH, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        c.scale(pxW / W, pxW / W);

        boolean known = progress != null;
        float elapsed = known ? (float) Math.max(0, Math.min(1, progress)) : 0f;
        float sandTop = NECK - (1 - elapsed) * (NECK - SAND_TOP_FULL);
        float pile = BOT - elapsed * (BOT - PILE_FULL);

        Path topBulb = new Path();
        topBulb.moveTo(CX - 34, TOP);
        topBulb.cubicTo(CX - 40, TOP + 34, CX - 8, NECK - 22, CX - 3.5f, NECK);
        topBulb.lineTo(CX + 3.5f, NECK);
        topBulb.cubicTo(CX + 8, NECK - 22, CX + 40, TOP + 34, CX + 34, TOP);
        topBulb.close();
        Path botBulb = new Path();
        botBulb.moveTo(CX - 3.5f, NECK);
        botBulb.cubicTo(CX - 8, NECK + 22, CX - 40, BOT - 34, CX - 34, BOT);
        botBulb.lineTo(CX + 34, BOT);
        botBulb.cubicTo(CX + 40, BOT - 34, CX + 8, NECK + 22, CX + 3.5f, NECK);
        botBulb.close();

        // The round dials carry their own bezel face; the bench gets a dark plate so it
        // reads on any wallpaper. Same metal rim and key light as DialBezel.
        RectF plate = new RectF(3, 3, W - 3, H - 3);
        c.drawRoundRect(new RectF(3, 6, W - 3, H), 24, 24, DialArt.fill(DialArt.alpha(0xFF000000, .35f)));
        Paint rimPaint = DialArt.fill(0xFF000000);
        rimPaint.setShader(new LinearGradient(0, 0, W, H,
            new int[] {DialArt.alpha(0xFFC3CEDE, .48f), 0xFF17212F, 0xFF080F19, DialArt.alpha(0xFF6E8098, .45f), 0xFF0B111B},
            new float[] {0, .24f, .51f, .77f, 1}, Shader.TileMode.CLAMP));
        c.drawRoundRect(plate, 24, 24, rimPaint);
        RectF face = new RectF(8, 8, W - 8, H - 8);
        c.drawRoundRect(face, 20, 20, DialArt.fill(0xFF0B131F));
        Paint faceLight = DialArt.fill(0xFF000000);
        faceLight.setShader(new RadialGradient(W * .4f, H * .3f, W * .75f,
            new int[] {DialArt.alpha(DialArt.ACCENT, .12f), DialArt.alpha(0xFF0B131F, 0f), DialArt.alpha(0xFF050910, .92f)},
            new float[] {0, .55f, 1}, Shader.TileMode.CLAMP));
        c.drawRoundRect(face, 20, 20, faceLight);
        c.drawRoundRect(face, 20, 20, DialArt.strokePaint(0xFF02050A, 1.5f));
        c.drawRoundRect(new RectF(10, 10, W - 10, H - 10), 18, 18, DialArt.strokePaint(DialArt.alpha(0xFFCFDDF0, .12f), .5f));

        // Halo and table shadow.
        Paint halo = DialArt.fill(0xFF000000);
        halo.setShader(new RadialGradient(CX, 124, 120,
            DialArt.alpha(DialArt.ACCENT, .12f), DialArt.alpha(DialArt.ACCENT, 0f), Shader.TileMode.CLAMP));
        c.save();
        c.scale(1f, 96f / 120f, CX, 124);
        c.drawCircle(CX, 124, 120, halo);
        c.restore();
        c.drawOval(new RectF(CX - 72, 207, CX + 72, 221), DialArt.fill(DialArt.alpha(0xFF000000, .35f)));

        // Back post.
        c.drawRect(CX - 2, TOP - 4, CX + 2, BOT + 4, DialArt.fill(DialArt.alpha(0xFF0B111B, .8f)));

        // Glass and sand.
        Paint dark = DialArt.fill(DialArt.alpha(0xFF04070C, .55f));
        c.drawPath(topBulb, dark);
        c.drawPath(botBulb, dark);
        Paint strata = DialArt.strokePaint(DialArt.alpha(0xFF000000, .12f), .8f);
        if (known && elapsed < 1) {
            c.save();
            c.clipPath(topBulb);
            c.drawRect(CX - 44, sandTop, CX + 44, NECK + 2, sand(sandTop, NECK + 2));
            Path dip = new Path();
            dip.moveTo(CX - 44, sandTop);
            dip.quadTo(CX, sandTop + Math.min(10, (NECK - sandTop) * .6f), CX + 44, sandTop);
            dip.close();
            c.drawPath(dip, dark);
            for (float k : new float[] {.35f, .7f}) {
                float y = sandTop + (NECK - sandTop) * k;
                c.drawLine(CX - 44, y, CX + 44, y, strata);
            }
            c.restore();
        }
        if (known && elapsed > 0) {
            c.save();
            c.clipPath(botBulb);
            Path heap = new Path();
            heap.moveTo(CX - 46, BOT + 2);
            heap.lineTo(CX - 46, pile + 7);
            heap.quadTo(CX - 22, pile + 4, CX, pile);
            heap.quadTo(CX + 22, pile + 4, CX + 46, pile + 7);
            heap.lineTo(CX + 46, BOT + 2);
            heap.close();
            c.drawPath(heap, sand(pile, BOT + 2));
            for (float k : new float[] {.4f, .75f}) {
                float y = pile + (BOT - pile) * k;
                c.drawLine(CX - 46, y, CX + 46, y, strata);
            }
            c.restore();
        }
        if (known && elapsed > 0 && elapsed < 1) {
            Paint stream = DialArt.strokePaint(DialArt.alpha(DialArt.ACCENT, .55f), .8f);
            stream.setPathEffect(new DashPathEffect(new float[] {.8f, 2.2f}, 0));
            c.drawLine(CX, NECK - 1, CX, pile, stream);
        }
        Paint glass = DialArt.fill(0xFF000000);
        glass.setShader(new LinearGradient(CX - 37, 0, CX + 37, 0,
            new int[] {DialArt.alpha(0xFFDBE6F6, .2f), DialArt.alpha(0xFFDBE6F6, .04f), DialArt.alpha(0xFFDBE6F6, .02f), DialArt.alpha(0xFFDBE6F6, .14f)},
            new float[] {0, .22f, .8f, 1}, Shader.TileMode.CLAMP));
        Paint glassEdge = DialArt.strokePaint(DialArt.alpha(0xFFB4C4DA, .4f), .7f);
        for (Path bulb : new Path[] {topBulb, botBulb}) {
            c.drawPath(bulb, glass);
            c.drawPath(bulb, glassEdge);
        }
        Paint sheen = DialArt.strokePaint(DialArt.alpha(0xFFF2F7FF, .3f), 1.6f);
        sheen.setStrokeCap(Paint.Cap.ROUND);
        Path s1 = new Path();
        s1.moveTo(CX - 28, TOP + 8);
        s1.cubicTo(CX - 31, TOP + 30, CX - 18, NECK - 30, CX - 9, NECK - 14);
        c.drawPath(s1, sheen);
        sheen.setColor(DialArt.alpha(0xFFF2F7FF, .2f));
        sheen.setStrokeWidth(1.4f);
        Path s2 = new Path();
        s2.moveTo(CX - 10, NECK + 16);
        s2.cubicTo(CX - 22, NECK + 34, CX - 31, BOT - 30, CX - 28, BOT - 8);
        c.drawPath(s2, sheen);

        // Frame posts.
        for (float dx : new float[] {-46, 46}) {
            float x0 = CX + dx - 2.6f, x1 = CX + dx + 2.6f;
            c.drawRoundRect(new RectF(x0, TOP - 4, x1, BOT + 4), 2, 2, post(x0, x1));
            for (float y : new float[] {TOP + 14, (TOP + BOT) / 2, BOT - 14}) {
                c.drawOval(new RectF(CX + dx - 4, y - 2, CX + dx + 4, y + 2), post(CX + dx - 4, CX + dx + 4));
            }
        }
        cap(c, TOP - 6, false);
        cap(c, BOT + 6, true);

        // Epoch scale, left of the lower bulb.
        text(c, "OF THIS ERA", 52, PILE_FULL - 12, TINY, DialArt.TINY, Paint.Align.LEFT, 1f);
        Paint tick = DialArt.strokePaint(DialArt.alpha(0xFF8FA2C0, .55f), .6f);
        for (float f : new float[] {0, .25f, .5f, .75f, 1}) {
            boolean major = f == 0 || f == .5f || f == 1;
            float y = BOT - f * (BOT - PILE_FULL);
            c.drawLine(CX - 62, y, CX - 62 - (major ? 7 : 4), y, tick);
            if (major) text(c, String.valueOf(Math.round(f * 100)), CX - 72, y + 2.6f, TINY, DialArt.TINY, Paint.Align.RIGHT, 1f);
        }
        if (known) {
            Path pointer = new Path();
            pointer.moveTo(CX - 60, pile);
            pointer.lineTo(CX - 64, pile - 2.5f);
            pointer.lineTo(CX - 64, pile + 2.5f);
            pointer.close();
            c.drawPath(pointer, DialArt.fill(DialArt.ACCENT));
            Paint lead = DialArt.strokePaint(DialArt.alpha(DialArt.ACCENT, .35f), .5f);
            lead.setPathEffect(new DashPathEffect(new float[] {1.5f, 3}, 0));
            c.drawLine(CX - 58, pile, CX - 30, pile, lead);
        }
        text(c, "TO HALVING", 52, 60, TINY, DialArt.TINY, Paint.Align.LEFT, 1f);
        text(c, blocksLeft != null ? NumberFormat.getIntegerInstance(Locale.US).format(blocksLeft) : "—",
            52, 74, 12f, PAPER, Paint.Align.LEFT, 1f);
        text(c, "BLOCKS", 52, 85, TINY, DialArt.TINY, Paint.Align.LEFT, .75f);
        if (known) {
            text(c, String.format(Locale.US, "%.1f%%", elapsed * 100), 52, PILE_FULL - 24, 11f, PAPER, Paint.Align.LEFT, 1f);
        }

        // Long clock: share of 21M issued.
        boolean issuedKnown = issuedPct != null;
        text(c, "21M", GAUGE_X + 6, GAUGE_TOP - 9, TINY, DialArt.TINY, Paint.Align.CENTER, 1f);
        RectF tube = new RectF(GAUGE_X, GAUGE_TOP, GAUGE_X + 12, GAUGE_BOT);
        c.drawRoundRect(tube, 6, 6, DialArt.fill(0xFF04070C));
        c.drawRoundRect(tube, 6, 6, DialArt.strokePaint(DialArt.alpha(0xFF9FB0C8, .35f), .6f));
        if (issuedKnown) {
            float top = gaugeY((float) Math.min(1, issuedPct / 100));
            Paint fillPaint = sand(top, GAUGE_BOT - 2);
            fillPaint.setAlpha(Math.round(.85f * 255));
            c.drawRoundRect(new RectF(GAUGE_X + 2.5f, top, GAUGE_X + 9.5f, GAUGE_BOT - 2), 3.5f, 3.5f, fillPaint);
        }
        Paint tubeShine = DialArt.strokePaint(DialArt.alpha(0xFFF2F7FF, .22f), 1);
        tubeShine.setStrokeCap(Paint.Cap.ROUND);
        c.drawLine(GAUGE_X + 3.5f, GAUGE_TOP + 6, GAUGE_X + 3.5f, GAUGE_BOT - 8, tubeShine);
        for (float f : new float[] {0, .5f, 1}) {
            float y = gaugeY(f);
            c.drawLine(GAUGE_X + 14, y, GAUGE_X + 18, y, tick);
            text(c, String.valueOf(Math.round(f * 100)), GAUGE_X + 21, y + 2.6f, TINY, DialArt.TINY, Paint.Align.LEFT, 1f);
        }
        text(c, issuedKnown ? String.format(Locale.US, "%.2f%%", issuedPct) : "—",
            GAUGE_X + 6, GAUGE_BOT + 14, TINY, PAPER, Paint.Align.CENTER, 1f);
        text(c, "ISSUED", GAUGE_X + 6, GAUGE_BOT + 24, TINY, DialArt.TINY, Paint.Align.CENTER, .75f);

        if (!known) text(c, "AWAITING HEIGHT", CX, NECK + 3, TINY, DialArt.TINY, Paint.Align.CENTER, 1f);
        if (offline) text(c, "OFFLINE · LAST KNOWN", 52, 226, TINY, DialArt.DOWN, Paint.Align.LEFT, 1f);
        return bmp;
    }

    private static float gaugeY(float f) {
        return GAUGE_BOT - f * (GAUGE_BOT - GAUGE_TOP);
    }

    private static Paint sand(float y0, float y1) {
        Paint p = DialArt.fill(0xFF000000);
        p.setShader(new LinearGradient(0, y0, 0, y1,
            new int[] {DialArt.alpha(0xFFFFF1DC, .9f), DialArt.ACCENT, ACCENT_DIM}, new float[] {0, .18f, 1}, Shader.TileMode.CLAMP));
        return p;
    }

    private static Paint post(float x0, float x1) {
        Paint p = DialArt.fill(0xFF000000);
        p.setShader(new LinearGradient(x0, 0, x1, 0,
            new int[] {0xFF4A586E, DialArt.alpha(0xFFC3CEDE, .8f), 0xFF1A2433, 0xFF0B111B}, new float[] {0, .35f, .6f, 1}, Shader.TileMode.CLAMP));
        return p;
    }

    private static void cap(Canvas c, float y, boolean flip) {
        float sy = y + (flip ? 3 : -3);
        c.drawOval(new RectF(CX - 54, sy - 6, CX + 54, sy + 6), DialArt.fill(DialArt.alpha(0xFF000000, .3f)));
        Paint wood = DialArt.fill(0xFF000000);
        wood.setShader(new LinearGradient(CX - 54, y - 5, CX + 54, y + 5,
            new int[] {0xFF6C7B92, 0xFF232E3E, 0xFF0E141E, 0xFF3A4A60}, new float[] {0, .3f, .7f, 1}, Shader.TileMode.CLAMP));
        RectF slab = new RectF(CX - 54, y - 5, CX + 54, y + 5);
        c.drawRect(slab, wood);
        c.drawRect(slab, DialArt.strokePaint(DialArt.alpha(0xFF9AAAC0, .35f), .6f));
        c.drawLine(CX - 54, y - 5, CX + 54, y - 5, DialArt.strokePaint(DialArt.alpha(0xFFEEF3FA, .3f), .7f));
        float iy = flip ? y - 5 : y + 5;
        c.drawOval(new RectF(CX - 40, iy - 2.4f, CX + 40, iy + 2.4f), DialArt.fill(DialArt.alpha(0xFF05080D, .8f)));
    }

    private static void text(Canvas c, String s, float x, float y, float size, int color, Paint.Align align, float opacity) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
        p.setTypeface(Typeface.MONOSPACE);
        p.setTextSize(size);
        p.setLetterSpacing(.08f);
        p.setTextAlign(align);
        p.setColor(DialArt.alpha(color, opacity));
        c.drawText(s, x, y, p);
    }
}
