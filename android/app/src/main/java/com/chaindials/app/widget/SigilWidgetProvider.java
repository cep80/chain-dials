package com.chaindials.app.widget;

import android.content.Context;
import android.widget.RemoteViews;

/** The Block Sigil: a new glyph with every block, so it checks every few minutes while awake. */
public class SigilWidgetProvider extends DialWidgetProvider {
    @Override
    protected long tickMs() {
        return 5 * 60_000L;
    }

    @Override
    protected int requestCode() {
        return 21;
    }

    @Override
    protected RemoteViews render(Context c, WidgetFeed.Reading r, float widthDp, float heightDp) {
        String hash = r != null ? r.blockHash : null;
        Long height = r != null ? r.blockHeight : null;
        String desc = hash != null
            ? "Block Sigil for block " + (height != null ? height : "") + ". A glyph engraved from the block hash."
            : "Block Sigil. Waiting for the next block.";
        return imageOnly(c, SigilArt.draw(squarePx(c, widthDp, heightDp), hash, height), desc);
    }
}
