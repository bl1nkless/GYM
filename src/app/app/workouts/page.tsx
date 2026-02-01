"use client";

import { useMemo } from "react";
import {
  WORKOUTS_PREVIEW_LIMIT,
  useRecentWorkouts,
} from "@/hooks/useRecentWorkouts";
import { CalendarIcon } from "@/components/icons";
import {
  CalendarStrip,
  QuickStartSection,
  WorkoutHistory,
  type WeekDay,
} from "@/components/workouts/home";

const buildWeekDays = (): WeekDay[] => {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - 2 + i);
    return {
      day: d
        .toLocaleDateString("ru-RU", { weekday: "short" })
        .toUpperCase()
        .slice(0, 2),
      date: d.getDate().toString(),
      active: i === 2,
    };
  });
};

export default function WorkoutHome() {
  const { workouts, loading } = useRecentWorkouts(WORKOUTS_PREVIEW_LIMIT);
  const weekDays = useMemo(() => buildWeekDays(), []);

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/80 px-4 pt-12 pb-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Тренировки</h1>
          <button className="rounded-full border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition-colors hover:text-white">
            <CalendarIcon />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-6">
        <CalendarStrip weekDays={weekDays} />
        <QuickStartSection />
        <WorkoutHistory loading={loading} workouts={workouts} />
      </main>
    </div>
  );
}
