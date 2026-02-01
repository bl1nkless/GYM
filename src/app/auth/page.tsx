"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/app/workouts");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push("/app/workouts");
          router.refresh();
        } else {
          setError("Проверьте почту для подтверждения регистрации!");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-4">
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
        <div className="text-center">
          <h1 className="mb-1 text-3xl font-bold text-white">GymTrack</h1>
          <p className="text-sm text-zinc-500">Твой прогресс в твоих руках</p>
        </div>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        <h2 className="mb-6 text-xl font-bold text-white">
          {mode === "login" ? "Вход" : "Регистрация"}
        </h2>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <svg
              className="h-5 w-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="ml-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
              Email
            </label>
            <div className="relative">
              <svg
                className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
                className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-800 pr-4 pl-12 text-white placeholder-zinc-600 transition-all outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
              Пароль
            </label>
            <div className="relative">
              <svg
                className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                disabled={loading}
                className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-800 pr-4 pl-12 text-white placeholder-zinc-600 transition-all outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.2)] transition-all hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {mode === "login" ? "Вход..." : "Регистрация..."}
              </>
            ) : mode === "login" ? (
              "Войти"
            ) : (
              "Создать аккаунт"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-sm text-zinc-500">
            {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
          </span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            className="text-sm font-semibold text-orange-500 transition-colors hover:text-orange-400"
          >
            {mode === "login" ? "Зарегистрироваться" : "Войти"}
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="mt-10 space-y-1 text-center text-sm text-zinc-600">
        <p>🏋️ Логирование тренировок</p>
        <p>📊 Аналитика по мышечным группам</p>
        <p>💡 Умные рекомендации по весам</p>
      </div>
    </div>
  );
}
