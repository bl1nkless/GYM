import type { SupabaseClient } from "@supabase/supabase-js";

interface TelegramAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    user_metadata: {
      telegram_id: string;
      username?: string;
      first_name?: string;
      last_name?: string;
      full_name?: string;
    };
  };
}

/**
 * Authenticate with Supabase using Telegram initData
 * Call this on app init when inside Telegram Mini App
 */
export async function createSupabaseSessionFromTelegram(
  supabase: SupabaseClient
): Promise<void> {
  const tg = (
    window as unknown as {
      Telegram?: { WebApp?: { initData?: string } };
    }
  ).Telegram?.WebApp;

  const initData = tg?.initData;
  if (!initData) {
    throw new Error("No Telegram initData available");
  }

  const res = await fetch("/api/auth/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "TG auth failed" }));
    throw new Error(error.error || "TG auth failed");
  }

  const data: TelegramAuthResponse = await res.json();

  // Set session in Supabase client - SDK will auto-refresh
  await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
}
