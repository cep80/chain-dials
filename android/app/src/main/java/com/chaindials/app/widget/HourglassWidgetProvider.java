package com.chaindials.app.widget;

import android.content.Context;
import android.widget.RemoteViews;

import java.util.Locale;

/** The Issuance Hourglass on its wide bench. The halving clock moves slowly; 30 minutes is plenty. */
public class HourglassWidgetProvider extends DialWidgetProvider {
    @Override
    protected long tickMs() {
        return 0;
    }

    @Override
    protected int requestCode() {
        return 41;
    }

    @Override
    protected RemoteViews render(Context c, WidgetFeed.Reading r, float widthDp, float heightDp) {
        float density = c.getResources().getDisplayMetrics().density;
        float w = Math.max(80f, widthDp - PADDING_DP * 2);
        float h = Math.max(60f, heightDp - PADDING_DP * 2);
        // Fit the 4:3 bench inside the box.
        float artW = Math.min(w, h * HourglassArt.W / HourglassArt.H);
        int px = Math.round(artW * density);

        Double progress = r != null ? r.halvingProgress : null;
        Long left = r != null ? r.halvingBlocksLeft : null;
        Double issued = r != null ? r.issuedPct : null;
        String desc = progress != null
            ? String.format(Locale.US, "Issuance Hourglass. Subsidy epoch %.1f percent complete.", progress * 100)
                + (left != null ? " " + left + " blocks to the next halving." : "")
                + (issued != null ? String.format(Locale.US, " %.2f percent of 21 million issued.", issued) : "")
            : "Issuance Hourglass. Waiting for block height.";
        return imageOnly(c, HourglassArt.draw(px, progress, left, issued, r != null && r.stale), desc);
    }
}
