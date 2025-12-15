"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, TrendingUp, User } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  // Helper to determine active state
  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-zinc-900/90 backdrop-blur-md border-t border-white/5 pb-safe pt-2 px-6 flex justify-between items-center z-30 h-[80px]">
      <Link href="/app/workouts">
        <div
          className={`flex flex-col items-center gap-1 w-16 ${
            isActive("/app/workouts")
              ? "text-orange-500"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Dumbbell size={24} />
          <span className="text-[10px] font-medium">Тренировки</span>
        </div>
      </Link>

      <Link href="/app/analytics">
        <div
          className={`flex flex-col items-center gap-1 w-16 ${
            isActive("/app/analytics")
              ? "text-orange-500"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <TrendingUp size={24} />
          <span className="text-[10px] font-medium">Аналитика</span>
        </div>
      </Link>

      <Link href="/app/profile">
        <div
          className={`flex flex-col items-center gap-1 w-16 ${
            isActive("/app/profile")
              ? "text-orange-500"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <User size={24} />
          <span className="text-[10px] font-medium">Профиль</span>
        </div>
      </Link>

      {/* CSS Utility for safe area padding on iPhone */}
      <style jsx>{`
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      `}</style>
    </nav>
  );
}

// Мы удалили FAB отсюда, так как решили делать кнопку "Новая" в интерфейсе страницы
export function NewWorkoutFAB() {
  return null;
}
