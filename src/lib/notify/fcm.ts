/**
 * Firebase Cloud Messaging (HTTP v1) over plain fetch, for the Android app.
 * iOS goes straight to Apple (apns.ts).
 *
 * FCM_SERVICE_ACCOUNT holds the service-account JSON from the Firebase
 * console (Project settings → Service accounts → Generate new private key).
 */

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

export type PushMessage = { title: string; body: string; path: string };

export type SendResult = "ok" | "dead" | "error";

const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

let cached: { token: string; exp: number } | null = null;

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw) as ServiceAccount;
    return sa.project_id && sa.client_email && sa.private_key ? sa : null;
  } catch {
    return null;
  }
}

export function fcmConfigured(): boolean {
  return serviceAccount() != null;
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

async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${b64url(sig)}`,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`FCM auth failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, exp: now + data.expires_in };
  return data.access_token;
}

/** The FCM v1 message body for one device. Exported for tests. */
export function fcmPayload(deviceToken: string, msg: PushMessage) {
  return {
    message: {
      token: deviceToken,
      notification: { title: msg.title, body: msg.body },
      data: { path: msg.path },
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    },
  };
}

export async function sendPush(deviceToken: string, msg: PushMessage): Promise<SendResult> {
  const sa = serviceAccount();
  if (!sa) return "error";
  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await accessToken(sa)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fcmPayload(deviceToken, msg)),
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (res.ok) return "ok";
    const text = await res.text();
    // The app was uninstalled or the token rotated: forget it.
    if (res.status === 404 || /UNREGISTERED/.test(text)) return "dead";
    console.error("fcm send failed", res.status, text.slice(0, 300));
    return "error";
  } catch (err) {
    console.error("fcm send error", err);
    return "error";
  }
}
