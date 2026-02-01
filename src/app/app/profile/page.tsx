"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  email: string;
  createdAt: string;
  displayName: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      setProfile({
        email: user.email || "",
        createdAt: user.created_at,
        displayName: null,
      });
      setLoading(false);
    }

    loadProfile();
  }, [supabase, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/auth");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/80 px-4 pt-12 pb-4 backdrop-blur-md">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold text-white">Профиль</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-6">
        {/* Avatar & Info Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800">
            <svg
              className="h-10 w-10 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-white">
              <svg
                className="h-4 w-4 text-zinc-500"
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
              <span className="text-sm">{profile?.email}</span>
            </div>

            {profile?.createdAt && (
              <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>
                  С нами с{" "}
                  {new Date(profile.createdAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/app/templates"
            className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
          >
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 text-orange-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="font-medium text-white">Мои шаблоны</span>
            </div>
            <svg
              className="h-5 w-5 text-zinc-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 py-4 font-semibold text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
          >
            {loggingOut ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            )}
            Выйти из аккаунта
          </button>
        </div>

        {/* Version */}
        <div className="pt-8 text-center text-xs text-zinc-600">
          GymTrack v0.1.0 (MVP)
        </div>
      </main>
    </div>
  );
}
