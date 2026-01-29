"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Activity, Plus } from "lucide-react";

function subscribeToActiveWorkout(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener("active-workout-change", handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("active-workout-change", handler);
  };
}

function getActiveWorkoutSnapshot() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("activeWorkoutId");
}

function getActiveWorkoutServerSnapshot() {
  return null;
}

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname.startsWith(path);

  if (
    pathname.startsWith("/app/workouts/active") ||
    pathname.startsWith("/app/workouts/new")
  ) {
    return null;
  }

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-zinc-800 z-50 pb-safe">
      <div className="max-w-2xl mx-auto flex justify-around items-center h-16 px-4">
        <Link
          href="/app/workouts"
          className="flex flex-col items-center gap-1 py-2"
        >
          <svg
            className={`w-6 h-6 ${
              isActive("/app/workouts") ? "text-orange-500" : "text-zinc-500"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h2v12H4zM18 6h2v12h-2zM8 10h8v4H8z"
            />
          </svg>
          <span
            className={`text-[10px] font-medium ${
              isActive("/app/workouts") ? "text-orange-500" : "text-zinc-500"
            }`}
          >
            Тренировки
          </span>
        </Link>

        <Link
          href="/app/analytics"
          className="flex flex-col items-center gap-1 py-2"
        >
          <svg
            className={`w-6 h-6 ${
              isActive("/app/analytics") ? "text-orange-500" : "text-zinc-500"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <span
            className={`text-[10px] font-medium ${
              isActive("/app/analytics") ? "text-orange-500" : "text-zinc-500"
            }`}
          >
            Аналитика
          </span>
        </Link>

        <Link
          href="/app/profile"
          className="flex flex-col items-center gap-1 py-2"
        >
          <svg
            className={`w-6 h-6 ${
              isActive("/app/profile") ? "text-orange-500" : "text-zinc-500"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span
            className={`text-[10px] font-medium ${
              isActive("/app/profile") ? "text-orange-500" : "text-zinc-500"
            }`}
          >
            Профиль
          </span>
        </Link>
      </div>

      <style jsx>{`
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </nav>
  );
}

export function NewWorkoutFAB() {
  const pathname = usePathname();
  const activeWorkoutId = useSyncExternalStore(
    subscribeToActiveWorkout,
    getActiveWorkoutSnapshot,
    getActiveWorkoutServerSnapshot
  );

  if (
    pathname.startsWith("/app/workouts/new") ||
    pathname.startsWith("/app/workouts/active")
  ) {
    return null;
  }

  const isActive = Boolean(activeWorkoutId);
  const label = isActive ? "Вернуться к тренировке" : "Начать тренировку";

  return (
    <Link
      href="/app/workouts/active"
      className={`fab-new-workout${isActive ? " active" : ""}`}
      aria-label={label}
      title={label}
    >
      {isActive ? <Activity size={22} /> : <Plus size={22} />}
    </Link>
  );
}
