"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Calendar,
  Dumbbell,
  ChevronRight,
  Activity,
  Flame,
  Trophy,
} from "lucide-react";

// --- TS Interfaces ---
interface Workout {
  id: string;
  title: string;
  date: string;
  duration: string;
  volume: string;
  tags: string[];
  isPr: boolean;
}

const WorkoutHome = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // Fetch Data from Supabase
  useEffect(() => {
    let cancelled = false;

    async function loadWorkouts() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("workout_sessions")
        .select(
          `
          id,
          performed_at,
          name,
          workout_exercises (
            exercises (
              muscle_groups (
                name
              )
            ),
            workout_sets (
              weight,
              reps
            )
          )
        `
        )
        .eq("user_id", user.id)
        .order("performed_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading workouts:", error);
        if (!cancelled) setLoading(false);
        return;
      }

      // Transform Supabase Data to UI Interface
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted: Workout[] = (data || []).map((session: any) => {
        let totalTonnage = 0;
        const uniqueTags = new Set<string>();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.workout_exercises?.forEach((we: any) => {
          // Calculate volume
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          we.workout_sets?.forEach((s: any) => {
            if (s.weight && s.reps) {
              totalTonnage += s.weight * s.reps;
            }
          });
          // Tags
          if (we.exercises?.muscle_groups?.name) {
            uniqueTags.add(we.exercises.muscle_groups.name);
          }
        });

        const dateObj = new Date(session.performed_at);
        const dateDisplay = dateObj.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        // Simple check to identify "recent" vs "old" for visual separation if needed
        // For now just mapped to flat list
        return {
          id: session.id,
          title: session.name || "Тренировка",
          date: dateDisplay,
          duration: "45м", // Placeholder
          volume:
            totalTonnage > 0 ? `${(totalTonnage / 1000).toFixed(1)} т` : "-",
          tags: Array.from(uniqueTags).slice(0, 2),
          isPr: false, // Placeholder
        };
      });

      if (cancelled) return;
      setWorkouts(formatted);
      setLoading(false);
    }

    loadWorkouts();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Данные для календаря (динамические) - инициализация сразу в useState без useEffect
  const [weekDays] = useState<{ day: string; date: string; active: boolean }[]>(
    () => {
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
    }
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-orange-500/30 pb-24 relative overflow-hidden">
      {/* --- HEADER --- */}
      <header className="px-5 pt-10 pb-6 bg-zinc-950 sticky top-0 z-10">
        <div className="flex justify-between items-center pb-4">
          <h1 className="text-3xl font-bold tracking-tight">Тренировки</h1>
          <button className="p-3 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors">
            <Calendar size={22} />
          </button>
        </div>

        <div className="h-8"></div>

        {/* Календарная лента (Calendar Strip) */}
        <div className="flex justify-between items-center">
          {weekDays.map((item, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-2 cursor-pointer group"
            >
              <span
                className={`text-xs font-medium ${
                  item.active
                    ? "text-orange-500"
                    : "text-zinc-500 group-hover:text-zinc-300"
                }`}
              >
                {item.day}
              </span>
              <div
                className={`
                w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold transition-all
                ${
                  item.active
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                    : "bg-transparent text-zinc-400 border border-transparent group-hover:border-zinc-800"
                }
              `}
              >
                {item.date}
              </div>
              {/* Точка-индикатор наличия тренировки */}
              {(index === 0 || index === 2) && (
                <div
                  className={`w-1 h-1 rounded-full mt-1 ${
                    item.active ? "bg-white" : "bg-zinc-600"
                  }`}
                ></div>
              )}
            </div>
          ))}
        </div>
      </header>

      <main className="px-5 space-y-12 mt-6">
        <div className="space-y-12">
          {/* --- DASHBOARD SUMMARY --- */}
          <section className="bg-zinc-900 rounded-3xl p-10 flex items-center justify-between shadow-lg shadow-black/20 border border-zinc-800/50">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">
                Цель на неделю
              </div>
              <div className="text-4xl font-bold text-white mb-1">
                3{" "}
                <span className="text-zinc-600 text-2xl font-medium">/ 4</span>
              </div>
              <p className="text-base text-zinc-400">Отличный темп! 🔥</p>
            </div>

            {/* Круговой индикатор (SVG Ring) */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-zinc-800"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="226.2"
                  strokeDashoffset="56.5" // 75% заполнено
                  className="text-orange-500"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-bold">75%</span>
            </div>
          </section>

          {/* --- TEMPLATES (HORIZONTAL SCROLL) --- */}
          <section>
            <div className="flex justify-between items-end mb-6 px-1">
              <h2 className="text-lg font-semibold text-zinc-200">
                Быстрый старт
              </h2>
              <span className="text-xs text-orange-500 font-medium cursor-pointer">
                Все шаблоны
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-6 -mx-5 px-5 scrollbar-hide snap-x">
              {/* Карточка создания */}
              <Link
                href="/app/workouts/new"
                className="snap-start flex-shrink-0 w-36 h-40 border-2 border-dashed border-zinc-700 hover:border-orange-500 rounded-xl flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-orange-500 hover:bg-zinc-900/50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-orange-500/20 flex items-center justify-center transition-colors">
                  <Plus size={22} />
                </div>
                <span className="text-sm font-semibold">Новая</span>
              </Link>

              {/* Шаблон 1 */}
              <div className="snap-start flex-shrink-0 w-40 h-40 bg-zinc-900 rounded-xl p-5 pb-6 flex flex-col justify-between border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Dumbbell size={56} />
                </div>
                <Dumbbell size={24} className="text-orange-500" />
                <div>
                  <h3 className="font-bold text-base leading-tight mb-1">
                    День Ног
                  </h3>
                  <p className="text-xs text-zinc-500">Присед, Жим...</p>
                </div>
              </div>

              {/* Шаблон 2 */}
              <div className="snap-start flex-shrink-0 w-40 h-40 bg-zinc-900 rounded-xl p-5 pb-6 flex flex-col justify-between border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Flame size={56} />
                </div>
                <Flame size={24} className="text-red-500" />
                <div>
                  <h3 className="font-bold text-base leading-tight mb-1">
                    Full Body
                  </h3>
                  <p className="text-xs text-zinc-500">45 мин · Интенсив</p>
                </div>
              </div>

              {/* Шаблон 3 */}
              <div className="snap-start flex-shrink-0 w-40 h-40 bg-zinc-900 rounded-xl p-5 pb-6 flex flex-col justify-between border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors relative overflow-hidden group">
                <Activity size={24} className="text-blue-500" />
                <div>
                  <h3 className="font-bold text-base leading-tight mb-1">
                    Кардио
                  </h3>
                  <p className="text-xs text-zinc-500">Беговая дорожка</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* --- HISTORY LIST --- */}
        <section>
          <h2 className="text-xl font-bold text-zinc-100 mb-6 px-1">История</h2>

          {loading ? (
            // Skeleton loader
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-zinc-900 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : workouts.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              Нет истории тренировок
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {workouts.map((workout) => (
                <Link
                  href={`/app/workouts/${workout.id}`}
                  key={workout.id}
                  className="group block bg-zinc-900 rounded-2xl p-6 border border-zinc-800/50 hover:bg-zinc-800 transition-all active:scale-[0.99] cursor-pointer"
                >
                  {/* Верхняя строка - иконка, заголовок, дата, chevron */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      {/* Иконка */}
                      <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center text-zinc-400 transition-colors">
                        {workout.tags.includes("Кардио") ||
                        workout.title.includes("Кардио") ? (
                          <Activity size={20} />
                        ) : (
                          <Dumbbell size={20} />
                        )}
                      </div>

                      {/* Заголовок и дата */}
                      <div>
                        <h3 className="font-bold text-white text-base leading-tight">
                          {workout.title}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {workout.date}
                        </p>
                      </div>
                    </div>

                    {/* Chevron */}
                    <ChevronRight
                      size={18}
                      className="text-zinc-600 group-hover:text-zinc-500 transition-colors"
                    />
                  </div>

                  {/* Нижняя строка - теги и метрики */}
                  <div className="flex items-center justify-between">
                    {/* Теги мышечных групп */}
                    <div className="flex gap-2">
                      {workout.tags.length > 0 ? (
                        workout.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 font-medium"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-600 py-1">
                          Нет тегов
                        </span>
                      )}
                    </div>

                    {/* Метрики справа */}
                    <div className="flex items-center gap-3 text-xs font-medium">
                      {workout.isPr && (
                        <div className="flex items-center gap-1 text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded">
                          <Trophy size={10} />
                          <span className="text-[10px] font-bold">PR</span>
                        </div>
                      )}

                      <span className="text-zinc-400">{workout.duration}</span>

                      {workout.volume !== "-" && (
                        <>
                          <span className="text-zinc-700">|</span>
                          <span className="text-zinc-200">
                            {workout.volume}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* CSS Utility for hiding scrollbar in horizontal lists but keeping functionality */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default WorkoutHome;
