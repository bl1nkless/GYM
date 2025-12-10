"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dumbbell, Mail, Lock, Loader2, AlertCircle } from "lucide-react";

type AuthMode = "login" | "register";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Проверяем, есть ли сессия (если Confirm email отключён — сессия будет)
        if (data.session) {
          router.push("/app/workouts");
          router.refresh();
        } else {
          // Email требует подтверждения
          setError("Проверьте почту для подтверждения регистрации!");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Произошла ошибка";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
  };

  return (
    <div
      className="app-container"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingBottom: 0,
      }}
    >
      <div className="page-content">
        {/* Logo */}
        <div
          className="flex-center mb-lg"
          style={{ flexDirection: "column", gap: "var(--space-md)" }}
        >
          <div
            className="flex-center"
            style={{
              width: 80,
              height: 80,
              borderRadius: "var(--radius-xl)",
              background: "var(--accent-primary)",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            <Dumbbell size={40} color="white" />
          </div>
          <div style={{ textAlign: "center" }}>
            <h1
              className="heading-1"
              style={{ marginBottom: "var(--space-xs)" }}
            >
              GymTrack
            </h1>
            <p className="text-small text-muted">Твой прогресс в твоих руках</p>
          </div>
        </div>

        {/* Auth Form */}
        <form
          onSubmit={handleSubmit}
          className="card"
          style={{ marginTop: "var(--space-xl)" }}
        >
          <h2 className="heading-2 mb-lg">
            {mode === "login" ? "Вход" : "Регистрация"}
          </h2>

          {error && (
            <div
              className="animate-fade-in mb-md"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                padding: "var(--space-md)",
                background: "var(--color-danger-bg)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-danger)",
                fontSize: "0.875rem",
              }}
            >
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="input-group mb-md">
            <label className="input-label" htmlFor="email">
              Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={18}
                style={{
                  position: "absolute",
                  left: "var(--space-md)",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                id="email"
                type="email"
                className="input"
                style={{ paddingLeft: "2.75rem" }}
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group mb-lg">
            <label className="input-label" htmlFor="password">
              Пароль
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={18}
                style={{
                  position: "absolute",
                  left: "var(--space-md)",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                id="password"
                type="password"
                className="input"
                style={{ paddingLeft: "2.75rem" }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-wide btn-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2
                  size={20}
                  className="animate-spin"
                  style={{ animation: "spin 0.8s linear infinite" }}
                />
                {mode === "login" ? "Вход..." : "Регистрация..."}
              </>
            ) : mode === "login" ? (
              "Войти"
            ) : (
              "Создать аккаунт"
            )}
          </button>

          <div style={{ textAlign: "center", marginTop: "var(--space-lg)" }}>
            <span className="text-small text-muted">
              {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
            </span>
            <button
              type="button"
              onClick={toggleMode}
              className="text-small text-accent"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {mode === "login" ? "Зарегистрироваться" : "Войти"}
            </button>
          </div>
        </form>

        {/* Features hint */}
        <div style={{ marginTop: "var(--space-2xl)", textAlign: "center" }}>
          <p className="text-caption">
            🏋️ Логирование тренировок
            <br />
            📊 Аналитика по мышечным группам
            <br />
            💡 Умные рекомендации по весам
          </p>
        </div>
      </div>
    </div>
  );
}
