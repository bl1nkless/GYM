"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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

interface WeekDay {
  day: string;
  date: string;
  active: boolean;
}

interface TemplateExercise {
  id: string;
  exercises: {
    name: string;
    muscle_groups: {
      name: string;
    };
  };
}

interface Template {
  id: string;
  name: string;
  created_at: string;
  workout_template_exercises: TemplateExercise[];
}

// Компонент для быстрого старта с шаблонами
function QuickStartSection() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    async function fetchTemplates() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("workout_templates")
        .select(
          `
          id,
          name,
          created_at,
          workout_template_exercises (
            id,
            exercises (
              name,
              muscle_groups (
                name
              )
            )
          )
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error loading templates:", error);
        setLoading(false);
        return;
      }

      setTemplates(data as unknown as Template[]);
      setLoading(false);
    }

    fetchTemplates();
  }, []);

  const handleSeedTemplates = async () => {
    setSeeding(true);
    try {
      const { seedDefaultTemplates } = await import("@/lib/seed-templates");
      const result = await seedDefaultTemplates();
      if (result.success) {
        // Перезагружаем шаблоны
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("workout_templates")
            .select(
              `
              id,
              name,
              created_at,
              workout_template_exercises (
                id,
                exercises (
                  name,
                  muscle_groups (
                    name
                  )
                )
              )
            `,
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5);
          if (data) {
            setTemplates(data as unknown as Template[]);
          }
        }
      } else {
        console.log(result.message);
      }
    } catch (err) {
      console.error("Error seeding templates:", err);
    }
    setSeeding(false);
  };

  // Генерируем цвет на основе имени шаблона
  const getTemplateColor = (name: string) => {
    const colors = [
      "text-orange-500",
      "text-red-500",
      "text-blue-500",
      "text-green-500",
      "text-purple-500",
      "text-pink-500",
      "text-yellow-500",
      "text-cyan-500",
    ];
    const hash = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Формируем подзаголовок из упражнений
  const getTemplateSub = (template: Template) => {
    const exercises = template.workout_template_exercises || [];
    if (exercises.length === 0) return "Пустой шаблон";
    const names = exercises
      .slice(0, 2)
      .map((e) => e.exercises?.name)
      .filter(Boolean);
    const suffix = exercises.length > 2 ? "..." : "";
    return names.join(", ") + suffix;
  };

  return (
    <section>
      <div className="flex justify-between items-end mb-4">
        <h2 className="text-lg font-semibold text-white">Быстрый старт</h2>
        <Link
          href="/app/templates"
          className="text-xs text-orange-500 font-medium cursor-pointer hover:text-orange-400"
        >
          Все шаблоны
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {/* New Workout Card */}
        <Link
          href="/app/workouts/new"
          className="flex-shrink-0 w-32 h-36 border-2 border-dashed border-zinc-700 hover:border-orange-500 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-orange-500 hover:bg-zinc-900/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-orange-500/20 flex items-center justify-center transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold">Новая</span>
        </Link>

        {/* Loading State */}
        {loading && (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-36 h-36 bg-zinc-900 rounded-xl animate-pulse border border-zinc-800"
              />
            ))}
          </>
        )}

        {/* Template Cards */}
        {!loading &&
          templates.map((template) => (
            <Link
              key={template.id}
              href={`/app/workouts/new?template=${template.id}`}
              className="flex-shrink-0 w-36 h-36 bg-zinc-900 rounded-xl p-4 flex flex-col justify-between border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
            >
              <svg
                className={`w-6 h-6 ${getTemplateColor(template.name)}`}
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
              <div>
                <h3 className="font-bold text-sm text-white leading-tight mb-0.5 truncate">
                  {template.name}
                </h3>
                <p className="text-xs text-zinc-500 truncate">
                  {getTemplateSub(template)}
                </p>
              </div>
            </Link>
          ))}

        {/* No Templates - Load Default */}
        {!loading && templates.length === 0 && (
          <button
            onClick={handleSeedTemplates}
            disabled={seeding}
            className="flex-shrink-0 w-48 h-36 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl p-4 flex flex-col items-center justify-center border border-orange-500/30 hover:border-orange-500/50 transition-all cursor-pointer"
          >
            <svg
              className="w-8 h-8 text-orange-500 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <p className="text-sm font-medium text-orange-400 text-center">
              {seeding ? "Загрузка..." : "Upper/Lower"}
            </p>
            <p className="text-xs text-zinc-500 text-center mt-1">
              Загрузить шаблоны
            </p>
          </button>
        )}
      </div>
    </section>
  );
}

export default function WorkoutHome() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // Данные для календаря
  const [weekDays] = useState<WeekDay[]>(() => {
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
  });

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
        `,
        )
        .eq("user_id", user.id)
        .order("performed_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading workouts:", error);
        if (!cancelled) setLoading(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted: Workout[] = (data || []).map((session: any) => {
        let totalTonnage = 0;
        const uniqueTags = new Set<string>();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.workout_exercises?.forEach((we: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          we.workout_sets?.forEach((s: any) => {
            if (s.weight && s.reps) {
              totalTonnage += s.weight * s.reps;
            }
          });
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

        return {
          id: session.id,
          title: session.name || "Тренировка",
          date: dateDisplay,
          duration: "45м",
          volume:
            totalTonnage > 0 ? `${(totalTonnage / 1000).toFixed(1)} т` : "-",
          tags: Array.from(uniqueTags).slice(0, 2),
          isPr: false,
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

  return (
    <div
      className="min-h-screen bg-black"
      style={{ overscrollBehaviorY: "none" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 pt-12 pb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-white">Тренировки</h1>
          <button className="p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-full transition-colors border border-zinc-800">
            <svg
              className="w-5 h-5"
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
          </button>
        </div>
      </header>

      <main className="px-4 pt-6 max-w-2xl mx-auto space-y-6">
        {/* Calendar Strip */}
        <div className="flex justify-between items-center bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
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
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                ${
                  item.active
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                    : "bg-transparent text-zinc-400 group-hover:bg-zinc-800"
                }`}
              >
                {item.date}
              </div>
              {item.active && <div className="w-1 h-1 rounded-full bg-white" />}
            </div>
          ))}
        </div>

        {/* Quick Start */}
        <QuickStartSection />

        {/* History */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">История</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-zinc-900 rounded-2xl animate-pulse border border-zinc-800"
                />
              ))}
            </div>
          ) : workouts.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-zinc-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h2v12H4zM18 6h2v12h-2zM8 10h8v4H8z"
                />
              </svg>
              Нет истории тренировок
            </div>
          ) : (
            <div className="space-y-3">
              {workouts.map((workout) => (
                <Link
                  key={workout.id}
                  href={`/app/workouts/${workout.id}`}
                  className="block bg-zinc-900 rounded-2xl p-4 border border-zinc-800 hover:border-zinc-700 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <svg
                          className="w-5 h-5"
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
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">
                          {workout.title}
                        </h3>
                        <p className="text-xs text-zinc-500">{workout.date}</p>
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-zinc-600"
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
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {workout.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {workout.isPr && (
                        <span className="text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          PR
                        </span>
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

      {/* Hide scrollbar CSS */}
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
}
