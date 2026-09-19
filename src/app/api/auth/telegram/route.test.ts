import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { validateInitData } from "./route";

describe("validateInitData", () => {
  it("accepts Telegram initData signed with the bot token", () => {
    const botToken = "123456789:AAExampleToken";
    const params = new URLSearchParams({
      auth_date: "1700000000",
      query_id: "AAExampleQuery",
      user: JSON.stringify({ id: 42, first_name: "Test" }),
    });
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
    const hash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    params.set("hash", hash);

    expect(validateInitData(params.toString(), botToken)).toBe(true);
    expect(validateInitData(params.toString(), "wrong-token")).toBe(false);
  });
});
