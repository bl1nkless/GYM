"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthStatus = "loading" | "success" | "error";

export default function TelegramBootstrapPage() {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const supabase = createClient();

      // Check if already authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        if (!cancelled) {
          setStatus("success");
          router.replace("/app/workouts");
        }
        return;
      }

      // Wait for Telegram SDK
      const tg = await waitForTelegramSDK(3000);
      if (!tg?.initData) {
        if (!cancelled) {
          setStatus("error");
          setError("Telegram SDK not available");
        }
        return;
      }

      // Call auth API
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: tg.initData }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const { access_token, refresh_token } = await res.json();

        // Set session and wait for it to persist
        await supabase.auth.setSession({ access_token, refresh_token });

        // Small delay to ensure cookies are set
        await new Promise((r) => setTimeout(r, 100));

        if (!cancelled) {
          setStatus("success");
          router.replace("/app/workouts");
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Auth failed");
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_0_30px_rgba(249,115,22,0.3)]">
          <svg
            className="h-10 w-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h2v12H4zM18 6h2v12h-2zM8 10h8v4H8z"
            />
          </svg>
        </div>

        {/* Status */}
        {status === "loading" && (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            <p className="text-sm text-zinc-400">Авторизация...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-sm text-zinc-400">Перенаправление...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white"
            >
              Повторить
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Helper to wait for Telegram SDK
function waitForTelegramSDK(timeout: number) {
  return new Promise<{ initData: string } | null>((resolve) => {
    const start = Date.now();

    const check = () => {
      const tg = (
        window as unknown as { Telegram?: { WebApp?: { initData?: string } } }
      ).Telegram?.WebApp;

      if (tg?.initData) {
        resolve({ initData: tg.initData });
        return;
      }

      if (Date.now() - start > timeout) {
        resolve(null);
        return;
      }

      setTimeout(check, 50);
    };

    check();
  });
}
