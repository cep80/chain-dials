package com.chaindials.app.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.SizeF;
import android.widget.RemoteViews;

import com.chaindials.app.MainActivity;
import com.chaindials.app.R;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Shared plumbing for the dial widgets: size-mapped RemoteViews, a shared
 * cached feed, and an optional inexact, non-waking redraw alarm (it only fires
 * while the device is awake, so it costs next to nothing).
 */
public abstract class DialWidgetProvider extends AppWidgetProvider {
    static final String ACTION_TICK = "com.chaindials.app.widget.DIAL_TICK";
    /** The endpoint is CDN-cached for 60s; a new block shows up within this. */
    static final long FETCH_EVERY_MS = 3 * 60_000L;
    /** Root padding in the dial layouts (dp). */
    static final float PADDING_DP = 4f;

    private static final ExecutorService IO = Executors.newSingleThreadExecutor();

    /** Redraw interval, or 0 to rely on updatePeriodMillis alone. */
    protected abstract long tickMs();

    /** Distinct per provider so PendingIntents don't collide. */
    protected abstract int requestCode();

    /** Draw the widget for one launcher-reported size. Reading may be null (no data yet). */
    protected abstract RemoteViews render(Context c, WidgetFeed.Reading r, float widthDp, float heightDp);

    @Override
    public void onEnabled(Context context) {
        schedule(context);
    }

    @Override
    public void onDisabled(Context context) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms != null) alarms.cancel(tickIntent(context));
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        // Also runs after a reboot, which clears alarms.
        schedule(context);
        refresh(context, ids, 0);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        refresh(context, new int[] {id}, FETCH_EVERY_MS);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_TICK.equals(intent.getAction())) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, getClass()));
            if (ids.length == 0) {
                onDisabled(context);
                return;
            }
            refresh(context, ids, FETCH_EVERY_MS);
        }
    }

    private void schedule(Context context) {
        long every = tickMs();
        if (every <= 0) return;
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms == null) return;
        alarms.setRepeating(AlarmManager.ELAPSED_REALTIME,
            SystemClock.elapsedRealtime() + every, every, tickIntent(context));
    }

    private void refresh(Context context, int[] ids, long maxAgeMs) {
        if (ids == null || ids.length == 0) return;
        final PendingResult pending = goAsync();
        final Context app = context.getApplicationContext();
        IO.execute(() -> {
            try {
                WidgetFeed.Reading r = maxAgeMs > 0
                    ? WidgetFeed.loadIfOlderThan(app, maxAgeMs)
                    : WidgetFeed.load(app);
                AppWidgetManager manager = AppWidgetManager.getInstance(app);
                for (int id : ids) manager.updateAppWidget(id, views(app, manager, id, r));
            } finally {
                pending.finish();
            }
        });
    }

    /** One RemoteViews per size the launcher reports, so the art is drawn at its real pixel size. */
    private RemoteViews views(Context c, AppWidgetManager manager, int id, WidgetFeed.Reading r) {
        Bundle opts = manager.getAppWidgetOptions(id);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ArrayList<SizeF> sizes = opts.getParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES);
            if (sizes != null && !sizes.isEmpty()) {
                Map<SizeF, RemoteViews> bySize = new HashMap<>();
                for (SizeF s : sizes) bySize.put(s, render(c, r, s.getWidth(), s.getHeight()));
                return new RemoteViews(bySize);
            }
        }
        // Portrait: min width by max height.
        float w = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 110);
        float h = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 110);
        return render(c, r, w, h);
    }

    /** A square dial that fits the widget box, in pixels. */
    static int squarePx(Context c, float widthDp, float heightDp) {
        float density = c.getResources().getDisplayMetrics().density;
        float dp = Math.max(60f, Math.min(widthDp, heightDp) - PADDING_DP * 2);
        return Math.round(dp * density);
    }

    /** The plain image-only layout used by the static dials. */
    static RemoteViews imageOnly(Context c, android.graphics.Bitmap art, String description) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_dial);
        v.setImageViewBitmap(R.id.widget_dial, art);
        v.setContentDescription(R.id.widget_dial, description);
        v.setOnClickPendingIntent(R.id.widget_root, openIntent(c, "https://chaindials.com/btc"));
        return v;
    }

    static PendingIntent openIntent(Context c, String url) {
        Intent open = new Intent(c, MainActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .setData(Uri.parse(url))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, 10, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent tickIntent(Context c) {
        Intent tick = new Intent(c, getClass()).setAction(ACTION_TICK);
        return PendingIntent.getBroadcast(c, requestCode(), tick, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
