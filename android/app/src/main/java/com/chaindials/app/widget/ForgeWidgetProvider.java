package com.chaindials.app.widget;

import android.content.Context;
import android.widget.RemoteViews;

import java.util.Locale;

/** The Hashrate Forge. Hashrate and the epoch move over hours, so the 30-minute update is plenty. */
public class ForgeWidgetProvider extends DialWidgetProvider {
    @Override
    protected long tickMs() {
        return 0;
    }

    @Override
    protected int requestCode() {
        return 31;
    }

    @Override
    protected RemoteViews render(Context c, WidgetFeed.Reading r, float widthDp, float heightDp) {
        Double heat = r != null ? r.hashrateHeat : null;
        Double rate = r != null ? r.hashrate : null;
        Double epoch = r != null ? r.retargetProgress : null;
        Double change = r != null ? r.retargetChange : null;
        String desc = "Hashrate Forge. " + (rate != null ? ForgeArt.formatHashrate(rate) + "." : "Waiting for hashrate.")
            + (epoch != null ? String.format(Locale.US, " Difficulty epoch %.0f%% complete.", epoch) : "")
            + (change != null ? String.format(Locale.US, " Estimated retarget %+.1f%%.", change) : "");
        return imageOnly(c, ForgeArt.draw(squarePx(c, widthDp, heightDp), heat, rate, epoch, change, r != null && r.stale), desc);
    }
}
