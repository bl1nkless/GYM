"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { isTelegram } from "@/lib/isTelegram";
import { createSupabaseSessionFromTelegram } from "@/lib/tgAuth";

/**
 * AppInit - Early client-side initialization for Telegram Mini App
 *
 * This component runs once on mount and:
 * 1. Detects if running inside Telegram
 * 2. Creates Supabase session silently using initData
 * 3. Does nothing in regular browser (web fallback uses /auth)
 */
export default function AppInit() {
  const initRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initRef.current) return;
    initRef.current = true;

    async function initTelegramAuth() {
      if (!isTelegram()) return;

      const supabase = createClient();

      // Check if we already have a valid session
      const { data } = await supabase.auth.getSession();
      if (data.session) return;

      // No session - create one silently
      try {
        await createSupabaseSessionFromTelegram(supabase);
        // Session created successfully
      } catch (error) {
        console.error("[AppInit] Telegram auth failed:", error);
      }
    }

    initTelegramAuth();
  }, []);

  return null;
}
