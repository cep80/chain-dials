package com.chaindials.app.widget;

import android.content.Context;
import android.content.SharedPreferences;

import com.chaindials.app.BuildConfig;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Reads /api/widget (see src/lib/widget.ts) and keeps the last good copy so
 * an offline wake still shows something, marked stale.
 */
final class WidgetFeed {
    static final String ENDPOINT = BuildConfig.WIDGET_API_BASE + "/api/widget";
    private static final String PREFS = "chaindials_widget";
    private static final String KEY_LAST = "last";
    private static final String KEY_FETCHED_AT = "fetchedAt";

    static final class Reading {
        Double priceUsd;
        Double changePct;
        double[] spark;
        Long blockHeight;
        Long blockTimeMs;
        Double feeFastest;
        Double feeHalfHour;
        Double feeHour;
        Long halvingBlocksLeft;
        Double halvingProgress;
        Double issuedPct;
        String blockHash;
        Double hashrate;
        Double hashrateHeat;
        Double retargetProgress;
        Double retargetChange;
        boolean stale;
    }

    private WidgetFeed() {}

    /** Blocking; call off the main thread. Returns null only with no network and no cache. */
    static Reading load(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try {
            String body = get(ENDPOINT);
            Reading r = parse(body);
            prefs.edit().putString(KEY_LAST, body).putLong(KEY_FETCHED_AT, System.currentTimeMillis()).apply();
            return r;
        } catch (Exception e) {
            String cached = prefs.getString(KEY_LAST, null);
            if (cached == null) return null;
            try {
                Reading r = parse(cached);
                r.stale = true;
                return r;
            } catch (JSONException ignored) {
                return null;
            }
        }
    }

    /** Fetches only when the cached copy is older than maxAgeMs; otherwise reads the cache. */
    static Reading loadIfOlderThan(Context context, long maxAgeMs) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long fetchedAt = prefs.getLong(KEY_FETCHED_AT, 0);
        String cached = prefs.getString(KEY_LAST, null);
        if (cached != null && System.currentTimeMillis() - fetchedAt < maxAgeMs) {
            try {
                return parse(cached);
            } catch (JSONException ignored) {
                // fall through to a fetch
            }
        }
        return load(context);
    }

    private static String get(String url) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(8000);
        conn.setReadTimeout(8000);
        conn.setUseCaches(false);
        conn.setRequestProperty("Accept", "application/json");
        try {
            int code = conn.getResponseCode();
            if (code != 200) throw new Exception("HTTP " + code);
            try (InputStream in = conn.getInputStream()) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
                return out.toString(StandardCharsets.UTF_8.name());
            }
        } finally {
            conn.disconnect();
        }
    }

    static Reading parse(String body) throws JSONException {
        JSONObject root = new JSONObject(body);
        Reading r = new Reading();

        JSONObject price = root.optJSONObject("price");
        if (price != null) {
            r.priceUsd = price.getDouble("usd");
            r.changePct = optDouble(price, "changePct24h");
        }

        JSONObject spark = root.optJSONObject("spark");
        if (spark != null) {
            JSONArray pts = spark.getJSONArray("points");
            r.spark = new double[pts.length()];
            for (int i = 0; i < pts.length(); i++) r.spark[i] = pts.getDouble(i);
        }

        JSONObject block = root.optJSONObject("block");
        if (block != null) {
            r.blockHeight = block.getLong("height");
            if (!block.isNull("timestamp")) r.blockTimeMs = block.getLong("timestamp");
            if (block.has("hash") && !block.isNull("hash")) r.blockHash = block.getString("hash");
        }

        JSONObject fees = root.optJSONObject("fees");
        if (fees != null) {
            r.feeFastest = fees.getDouble("fastest");
            r.feeHalfHour = fees.getDouble("halfHour");
            r.feeHour = fees.getDouble("hour");
        }

        JSONObject halving = root.optJSONObject("halving");
        if (halving != null) {
            r.halvingBlocksLeft = halving.getLong("blocksLeft");
            r.halvingProgress = halving.getDouble("progress");
            if (halving.has("issuedPct")) r.issuedPct = optDouble(halving, "issuedPct");
        }

        JSONObject hashrate = root.optJSONObject("hashrate");
        if (hashrate != null) {
            r.hashrate = hashrate.getDouble("current");
            r.hashrateHeat = hashrate.getDouble("heat");
        }

        JSONObject retarget = root.optJSONObject("retarget");
        if (retarget != null) {
            r.retargetProgress = retarget.getDouble("progress");
            r.retargetChange = optDouble(retarget, "change");
        }
        return r;
    }

    private static Double optDouble(JSONObject o, String key) {
        return o.isNull(key) ? null : o.optDouble(key);
    }
}
