package com.chaindials.app.widget;

import android.content.Context;
import android.os.SystemClock;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;

import com.chaindials.app.R;

/**
 * The Block Metronome dial. The art is redrawn about once a minute so the hand
 * creeps forward; the reading under the hub is a Chronometer, so seconds tick
 * on their own between redraws.
 */
public class MetronomeWidgetProvider extends DialWidgetProvider {
    private static final double TARGET_SECONDS = 600;

    @Override
    protected long tickMs() {
        return 60_000L;
    }

    @Override
    protected int requestCode() {
        return 11;
    }

    @Override
    protected RemoteViews render(Context c, WidgetFeed.Reading r, float widthDp, float heightDp) {
        int dialPx = squarePx(c, widthDp, heightDp);

        Double since = null;
        if (r != null && r.blockTimeMs != null) {
            since = Math.max(0, (System.currentTimeMillis() - r.blockTimeMs) / 1000.0);
        }
        boolean offline = r != null && r.stale;
        Long height = r != null ? r.blockHeight : null;

        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_metronome);
        v.setImageViewBitmap(R.id.widget_dial,
            DialArt.metronome(dialPx, since, height, TARGET_SECONDS, offline, false));
        v.setContentDescription(R.id.widget_dial, describe(since, height));

        if (since != null) {
            // Size and place the clock where the SVG puts its reading text.
            float unit = dialPx / 240f;
            float textPx = DialArt.READING_SIZE * unit;
            float centerOffset = (DialArt.READING_BASELINE - 120f - DialArt.READING_SIZE * 0.36f) * unit;
            v.setTextViewTextSize(R.id.widget_reading, TypedValue.COMPLEX_UNIT_PX, textPx);
            // Gravity centres the text in the padded box, so double the offset to move its centre by one.
            v.setViewPadding(R.id.widget_reading, 0, Math.round(centerOffset * 2), 0, 0);
            long ago = Math.round(since * 1000);
            v.setChronometer(R.id.widget_reading, SystemClock.elapsedRealtime() - ago, null, true);
            v.setViewVisibility(R.id.widget_reading, View.VISIBLE);
        } else {
            v.setViewVisibility(R.id.widget_reading, View.GONE);
        }

        v.setOnClickPendingIntent(R.id.widget_root, openIntent(c, "https://chaindials.com/btc"));
        return v;
    }

    private static String describe(Double since, Long height) {
        if (since == null) return "Block Metronome. Waiting for the latest block.";
        long laps = (long) Math.floor(since / TARGET_SECONDS);
        return "Block Metronome. " + DialArt.duration(since) + " since the last block"
            + (height != null ? ", block " + height : "")
            + ". Target 10 minutes." + (laps > 0 ? " " + laps + " intervals overdue." : "");
    }
}
