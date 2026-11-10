import { afterEach, describe, expect, it, vi } from "vitest";
import { apnsPayload } from "@/lib/notify/apns";
import { fcmPayload } from "@/lib/notify/fcm";
import { sendTelegram, telegramText } from "@/lib/notify/telegram";

const msg = { title: "Transaction confirmed", body: "Rent made it into block 900000.", path: "/btc/watch" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("push payloads", () => {
  it("FCM carries the text and the in-app path", () => {
    expect(fcmPayload("tok", msg)).toMatchObject({
      message: { token: "tok", notification: { title: msg.title, body: msg.body }, data: { path: "/btc/watch" } },
    });
  });

  it("APNs carries an alert and the path", () => {
    expect(apnsPayload(msg)).toEqual({
      aps: { alert: { title: msg.title, body: msg.body }, sound: "default" },
      path: "/btc/watch",
    });
  });
});

describe("telegram", () => {
  it("formats plain text with a link back", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://chaindials.com/");
    expect(telegramText(msg)).toBe(`${msg.title}\n${msg.body}\n\nhttps://chaindials.com/btc/watch`);
  });

  it("treats a 403 as a dead chat", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:abc");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendTelegram("42", msg)).toBe("dead");
    expect(fetchMock.mock.calls[0]![0]).toBe("https://api.telegram.org/bot123:abc/sendMessage");
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toMatchObject({ chat_id: "42" });
  });

  it("reports success", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:abc");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    expect(await sendTelegram("42", msg)).toBe("ok");
  });
});
