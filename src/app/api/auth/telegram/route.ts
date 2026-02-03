import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/**
 * Validate Telegram initData using HMAC-SHA256 (Mini Apps scheme)
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;
  params.delete("hash");

  // Собираем data_check_string: k=v построчно по ключам в алфавитном порядке
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // 1) secret_key = HMAC_SHA256("WebAppData", botToken)  (ключ = "WebAppData")
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // 2) hash_local = HMAC_SHA256(secret_key, data_check_string) -> hex
  const localHashHex = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // Сравниваем в константном времени для безопасности
  try {
    return crypto.timingSafeEqual(
      Buffer.from(localHashHex, "hex"),
      Buffer.from(hash, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { initData } = await req.json();

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!initData || !BOT_TOKEN) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Validate initData signature
    const isValid = validateInitData(initData, BOT_TOKEN);
    console.log("[TG Auth] initData validation:", isValid ? "PASS" : "FAIL");
    console.log("[TG Auth] BOT_TOKEN length:", BOT_TOKEN.length);

    if (!isValid) {
      console.warn("Invalid Telegram initData signature");
      return NextResponse.json({ error: "Invalid initData" }, { status: 401 });
    }

    // Parse user data from initData
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");
    if (!userStr) {
      return NextResponse.json(
        { error: "No user in initData" },
        { status: 400 }
      );
    }

    const tg = JSON.parse(userStr);
    const tg_id = String(tg.id);
    const username = tg.username || "";
    const first_name = tg.first_name || "";
    const last_name = tg.last_name || "";
    const full_name = [first_name, last_name].filter(Boolean).join(" ");

    // Synthetic email for this Telegram user
    const email = `tg_${tg_id}@telegram.local`;

    // Supabase clients
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Idempotently create/update user
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        telegram_id: tg_id,
        username,
        first_name,
        last_name,
        full_name,
        photo_url: tg.photo_url,
      },
    });

    // Ignore "user already exists" errors (422 or 409)
    if (createErr) {
      const status = (createErr as unknown as { status?: number }).status;
      if (status !== 422 && status !== 409) {
        // Check if it's actually a duplicate user error by message
        if (!createErr.message?.includes("already been registered")) {
          console.error("Error creating user:", createErr);
          return NextResponse.json(
            { error: "Failed to create user" },
            { status: 500 }
          );
        }
      }
    }

    // Generate magiclink to get OTP
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkErr || !link) {
      console.error("Error generating link:", linkErr);
      return NextResponse.json(
        { error: linkErr?.message || "Failed to generate link" },
        { status: 500 }
      );
    }

    // Extract OTP from link properties
    const otp = link.properties?.email_otp as string | undefined;
    if (!otp) {
      console.error("No OTP in generated link");
      return NextResponse.json({ error: "No OTP generated" }, { status: 500 });
    }

    // Verify OTP to get session (server-side)
    const { data: verified, error: vErr } = await anon.auth.verifyOtp({
      email,
      token: otp,
      type: "magiclink",
    });

    if (vErr || !verified?.session) {
      console.error("Error verifying OTP:", vErr);
      return NextResponse.json(
        { error: vErr?.message || "Verification failed" },
        { status: 500 }
      );
    }

    const { access_token, refresh_token, expires_in, user } = verified.session;

    return NextResponse.json({
      access_token,
      refresh_token,
      expires_in,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      },
    });
  } catch (error) {
    console.error("Telegram auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
