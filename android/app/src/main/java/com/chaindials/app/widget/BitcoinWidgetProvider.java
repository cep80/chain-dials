package com.chaindials.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Shader;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.SizeF;
import android.view.View;
import android.widget.RemoteViews;

import androidx.core.content.ContextCompat;

import com.chaindials.app.MainActivity;
import com.chaindials.app.R;

import java.text.NumberFormat;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Bitcoin home-screen widget: price, 24h sparkline, block clock, and (when
 * wide enough) fees and the halving bar. Data comes from /api/widget.
 */
public class BitcoinWidgetProvider extends AppWidgetProvider {
    static final String ACTION_REFRESH = "com.chaindials.app.widget.REFRESH";
    /** Below this width (dp) the fees column won't fit. */
    private static final int MEDIUM_MIN_WIDTH_DP = 230;

    private static final ExecutorService IO = Executors.newSingleThreadExecutor();

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        refresh(context, ids);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        // Pre-12 launchers can't swap layouts by size themselves.
        refresh(context, new int[] {id});
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            refresh(context, manager.getAppWidgetIds(new ComponentName(context, BitcoinWidgetProvider.class)));
        }
    }

    private void refresh(Context context, int[] ids) {
        if (ids == null || ids.length == 0) return;
        final PendingResult pending = goAsync();
        final Context app = context.getApplicationContext();
        IO.execute(() -> {
            try {
                WidgetFeed.Reading reading = WidgetFeed.load(app);
                AppWidgetManager manager = AppWidgetManager.getInstance(app);
                for (int id : ids) {
                    manager.updateAppWidget(id, views(app, manager, id, reading));
                }
            } finally {
                pending.finish();
            }
        });
    }

    private static RemoteViews views(Context c, AppWidgetManager manager, int id, WidgetFeed.Reading r) {
        if (r == null) {
            RemoteViews loading = new RemoteViews(c.getPackageName(), R.layout.widget_bitcoin_loading);
            loading.setOnClickPendingIntent(android.R.id.background, refreshIntent(c));
            return loading;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Map<SizeF, RemoteViews> bySize = new HashMap<>();
            bySize.put(new SizeF(100f, 100f), render(c, r, false));
            bySize.put(new SizeF(MEDIUM_MIN_WIDTH_DP, 100f), render(c, r, true));
            return new RemoteViews(bySize);
        }
        Bundle opts = manager.getAppWidgetOptions(id);
        int width = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        return render(c, r, width >= MEDIUM_MIN_WIDTH_DP);
    }

    private static RemoteViews render(Context c, WidgetFeed.Reading r, boolean medium) {
        RemoteViews v = new RemoteViews(
            c.getPackageName(), medium ? R.layout.widget_bitcoin_medium : R.layout.widget_bitcoin_small);

        int up = ContextCompat.getColor(c, R.color.widget_up);
        int down = ContextCompat.getColor(c, R.color.widget_down);
        int accent = ContextCompat.getColor(c, R.color.widget_accent);

        v.setTextViewText(R.id.widget_price, r.priceUsd != null ? usd(r.priceUsd) : "—");
        if (r.changePct != null) {
            v.setTextViewText(R.id.widget_change, pct(r.changePct));
            v.setTextColor(R.id.widget_change, r.changePct >= 0 ? up : down);
        } else {
            v.setTextViewText(R.id.widget_change, "");
        }

        int trend = r.changePct == null ? accent : (r.changePct >= 0 ? up : down);
        if (r.spark != null && r.spark.length > 1) {
            v.setImageViewBitmap(R.id.widget_spark, sparkline(c, r.spark, trend));
            v.setViewVisibility(R.id.widget_spark, View.VISIBLE);
        } else {
            v.setViewVisibility(R.id.widget_spark, View.INVISIBLE);
        }

        if (r.blockHeight != null) {
            v.setTextViewText(R.id.widget_height, "#" + integer(r.blockHeight) + (r.blockTimeMs != null ? " ·" : ""));
        } else {
            v.setTextViewText(R.id.widget_height, "block feed down");
        }
        if (r.blockTimeMs != null) {
            // Chronometer ticks on its own between refreshes; base is in the elapsedRealtime clock.
            long ago = Math.max(0, System.currentTimeMillis() - r.blockTimeMs);
            v.setChronometer(R.id.widget_since, SystemClock.elapsedRealtime() - ago, "%s ago", true);
            v.setViewVisibility(R.id.widget_since, View.VISIBLE);
        } else {
            v.setViewVisibility(R.id.widget_since, View.GONE);
        }
        v.setViewVisibility(R.id.widget_stale, r.stale ? View.VISIBLE : View.GONE);

        if (medium) {
            v.setTextViewText(R.id.widget_fee_next, feeRow("next", r.feeFastest));
            v.setTextViewText(R.id.widget_fee_30, feeRow("30m", r.feeHalfHour));
            v.setTextViewText(R.id.widget_fee_60, feeRow("1h", r.feeHour));
            if (r.halvingProgress != null && r.halvingBlocksLeft != null) {
                v.setProgressBar(R.id.widget_halving_bar, 1000, (int) Math.round(r.halvingProgress * 1000), false);
                v.setTextViewText(R.id.widget_halving_left, integer(r.halvingBlocksLeft) + " blocks");
            } else {
                v.setTextViewText(R.id.widget_halving_left, "—");
            }
        }

        // Tap anywhere opens the Bitcoin board; tap the block line to refresh now.
        v.setOnClickPendingIntent(android.R.id.background, openIntent(c));
        v.setOnClickPendingIntent(R.id.widget_block_row, refreshIntent(c));
        return v;
    }

    private static PendingIntent openIntent(Context c) {
        Intent open = new Intent(c, MainActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .setData(Uri.parse("https://chaindials.com/btc"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent refreshIntent(Context c) {
        Intent refresh = new Intent(c, BitcoinWidgetProvider.class).setAction(ACTION_REFRESH);
        return PendingIntent.getBroadcast(c, 1, refresh, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Line plus fading fill, drawn at a fixed aspect and stretched by the ImageView. */
    private static Bitmap sparkline(Context c, double[] pts, int color) {
        float density = c.getResources().getDisplayMetrics().density;
        int w = Math.round(160 * density);
        int h = Math.round(44 * density);
        float stroke = 1.6f * density;
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);

        float top = stroke;
        float usable = h - stroke * 2;
        float dx = (float) w / (pts.length - 1);
        Path line = new Path();
        for (int i = 0; i < pts.length; i++) {
            float x = i * dx;
            float y = top + usable * (1f - (float) pts[i]);
            if (i == 0) line.moveTo(x, y);
            else line.lineTo(x, y);
        }

        Path fill = new Path(line);
        fill.lineTo(w, h);
        fill.lineTo(0, h);
        fill.close();
        Paint fillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        fillPaint.setShader(new LinearGradient(0, 0, 0, h,
            (color & 0x00FFFFFF) | 0x47000000, color & 0x00FFFFFF, Shader.TileMode.CLAMP));
        canvas.drawPath(fill, fillPaint);

        Paint linePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        linePaint.setStyle(Paint.Style.STROKE);
        linePaint.setStrokeWidth(stroke);
        linePaint.setStrokeCap(Paint.Cap.ROUND);
        linePaint.setStrokeJoin(Paint.Join.ROUND);
        linePaint.setColor(color);
        canvas.drawPath(line, linePaint);
        return bmp;
    }

    private static String usd(double v) {
        NumberFormat f = NumberFormat.getCurrencyInstance(Locale.US);
        f.setMaximumFractionDigits(v >= 1000 ? 0 : 2);
        f.setMinimumFractionDigits(v >= 1000 ? 0 : 2);
        return f.format(v);
    }

    private static String integer(long v) {
        return NumberFormat.getIntegerInstance(Locale.US).format(v);
    }

    private static String pct(double v) {
        return String.format(Locale.US, "%s%.1f%%", v >= 0 ? "+" : "", v);
    }

    private static String feeRow(String label, Double v) {
        String value;
        if (v == null) value = "—";
        else if (v < 10 && v != Math.rint(v)) value = String.format(Locale.US, "%.1f", v);
        else value = String.valueOf(Math.round(v));
        // Monospace font, so padding lines the values up in a column.
        return String.format(Locale.US, "%-6s%6s", label, value);
    }
}
