/**
 * Apple Push Notification service, token-based auth, over HTTP/2.
 *
 * Capacitor's push plugin hands the iOS app an APNs device token (not an FCM
 * one), so iOS goes straight to Apple; Android goes through FCM (fcm.ts).
 *
 * Env: APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (the .p8 contents),
 * APNS_BUNDLE_ID (default com.chaindials.app), APNS_ENV ("sandbox" for
 * development builds, otherwise production).
 */

import { connect } from "node:http2";
import type { PushMessage, SendResult } from "@/lib/notify/fcm";

let cached: { jwt: string; iat: number } | null = null;

function config() {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const key = process.env.APNS_PRIVATE_KEY;
  if (!keyId || !teamId || !key) return null;
  return {
    keyId,
    teamId,
    key,
    bundleId: process.env.APNS_BUNDLE_ID ?? "com.chaindials.app",
    host:
      process.env.APNS_ENV === "sandbox"
        ? "https://api.sandbox.push.apple.com"
        : "https://api.push.apple.com",
  };
}

export function apnsConfigured(): boolean {
  return config() != null;
}

function b64url(data: ArrayBuffer | string): string {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  return Buffer.from(bytes).toString("base64url");
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/\\n/g, "\n")
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const buf = Buffer.from(body, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/** Apple wants the provider token refreshed between 20 and 60 minutes. */
async function providerToken(cfg: NonNullable<ReturnType<typeof config>>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && now - cached.iat < 40 * 60) return cached.jwt;
  const header = b64url(JSON.stringify({ alg: "ES256", kid: cfg.keyId }));
  const claims = b64url(JSON.stringify({ iss: cfg.teamId, iat: now }));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(cfg.key),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  // WebCrypto's ECDSA output is already the raw r||s form JWS expects.
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const jwt = `${header}.${claims}.${b64url(sig)}`;
  cached = { jwt, iat: now };
  return jwt;
}

/** The APNs JSON payload. Exported for tests. */
export function apnsPayload(msg: PushMessage) {
  return {
    aps: { alert: { title: msg.title, body: msg.body }, sound: "default" },
    path: msg.path,
  };
}

export async function sendApns(deviceToken: string, msg: PushMessage): Promise<SendResult> {
  const cfg = config();
  if (!cfg) return "error";
  let jwt: string;
  try {
    jwt = await providerToken(cfg);
  } catch (err) {
    console.error("apns auth error", err);
    return "error";
  }
  return new Promise<SendResult>((resolve) => {
    const client = connect(cfg.host);
    const finish = (result: SendResult) => {
      client.close();
      resolve(result);
    };
    client.on("error", (err) => {
      console.error("apns connection error", err);
      finish("error");
    });
    client.setTimeout(8_000, () => finish("error"));
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": cfg.bundleId,
      "apns-push-type": "alert",
      "content-type": "application/json",
    });
    let status = 0;
    let body = "";
    req.setEncoding("utf8");
    req.on("response", (headers) => {
      status = Number(headers[":status"]);
    });
    req.on("data", (chunk: string) => {
      body += chunk;
    });
    req.on("end", () => {
      if (status === 200) return finish("ok");
      // 410: the app was removed. BadDeviceToken: wrong environment or junk.
      if (status === 410 || /BadDeviceToken|Unregistered/.test(body)) return finish("dead");
      console.error("apns send failed", status, body.slice(0, 300));
      finish("error");
    });
    req.on("error", (err) => {
      console.error("apns request error", err);
      finish("error");
    });
    req.end(JSON.stringify(apnsPayload(msg)));
  });
}
