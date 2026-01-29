"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MuscleAnalytics } from "@/types/database.types";

const PERIOD_OPTIONS = [
  { days: 7, label: "7 дней" },
  { days: 30, label: "30 дней" },
  { days: 60, label: "60 дней" },
  { days: 90, label: "90 дней" },
];

function getStatusColor(daysAgo: number | null): string {
  if (daysAgo === null) return "bg-zinc-700";
  if (daysAgo <= 3) return "bg-green-500";
  if (daysAgo <= 7) return "bg-yellow-500";
  return "bg-red-500";
}

function formatLastTrained(dateStr: string | null): {
  text: string;
  daysAgo: number | null;
} {
  if (!dateStr) return { text: "Никогда", daysAgo: null };

  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (daysAgo === 0) return { text: "Сегодня", daysAgo: 0 };
  if (daysAgo === 1) return { text: "Вчера", daysAgo: 1 };
  if (daysAgo < 7) return { text: `${daysAgo} дн. назад`, daysAgo };

  return {
    text: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
    daysAgo,
  };
}

export default function AnalyticsPage() {
  const [periodDays, setPeriodDays] = useState(30);
  const [data, setData] = useState<MuscleAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - periodDays);

      const { data: workouts, error } = await supabase
        .from("workout_sessions")
        .select(
          `
          id,
          performed_at,
          workout_exercises (
            id,
            exercises (
              id,
              primary_muscle_group_id
            )
          )
        `
        )
        .eq("user_id", user.id)
        .gte("performed_at", fromDate.toISOString())
        .order("performed_at", { ascending: false });

      if (error) {
        console.error("Error loading analytics:", error);
        setLoading(false);
        return;
      }

      const { data: muscleGroups } = await supabase
        .from("muscle_groups")
        .select("*")
        .order("order_index");

      if (!muscleGroups) {
        setLoading(false);
        return;
      }

      // Aggregate data by muscle groups
      const analyticsMap = new Map<
        number,
        {
          lastTrainedAt: string | null;
          sessionsSet: Set<string>;
          lastSessionExercises: Set<string>;
        }
      >();

      muscleGroups.forEach((mg) => {
        analyticsMap.set(mg.id, {
          lastTrainedAt: null,
          sessionsSet: new Set(),
          lastSessionExercises: new Set(),
        });
      });

      const lastSessionByMuscle = new Map<number, string>();

      (workouts || []).forEach((session) => {
        (session.workout_exercises || []).forEach(
          (we: { exercises: { primary_muscle_group_id: number } | null }) => {
            const muscleId = we.exercises?.primary_muscle_group_id;
            if (!muscleId) return;

            const analytics = analyticsMap.get(muscleId);
            if (!analytics) return;

            if (
              !analytics.lastTrainedAt ||
              session.performed_at > analytics.lastTrainedAt
            ) {
              analytics.lastTrainedAt = session.performed_at;
              lastSessionByMuscle.set(muscleId, session.id);
            }

            analytics.sessionsSet.add(session.id);
          }
        );
      });

      (workouts || []).forEach((session) => {
        (session.workout_exercises || []).forEach(
          (we: {
            id: string;
            exercises: { primary_muscle_group_id: number } | null;
          }) => {
            const muscleId = we.exercises?.primary_muscle_group_id;
            if (!muscleId) return;

            if (lastSessionByMuscle.get(muscleId) === session.id) {
              const analytics = analyticsMap.get(muscleId);
              if (analytics) {
                analytics.lastSessionExercises.add(we.id);
              }
            }
          }
        );
      });

      const result: MuscleAnalytics[] = muscleGroups.map((mg) => {
        const analytics = analyticsMap.get(mg.id)!;
        return {
          muscleGroupId: mg.id,
          muscleGroupName: mg.name,
          lastTrainedAt: analytics.lastTrainedAt,
          sessionsCount: analytics.sessionsSet.size,
          exercisesInLastSession: analytics.lastSessionExercises.size,
        };
      });

      result.sort((a, b) => {
        if (!a.lastTrainedAt && !b.lastTrainedAt) return 0;
        if (!a.lastTrainedAt) return -1;
        if (!b.lastTrainedAt) return 1;
        return (
          new Date(a.lastTrainedAt).getTime() -
          new Date(b.lastTrainedAt).getTime()
        );
      });

      setData(result);
      setLoading(false);
    }

    loadAnalytics();
  }, [supabase, periodDays]);

  return (
    <div className="min-h-screen bg-black pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 pt-12 pb-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-white">Аналитика</h1>
        </div>
      </header>

      <main className="px-4 pt-6 max-w-2xl mx-auto space-y-6">
        {/* Period Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.days}
              onClick={() => setPeriodDays(option.days)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                ${
                  periodDays === option.days
                    ? "bg-orange-500 text-white"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>≤ 3 дн.</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>4-7 дн.</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>&gt; 7 дн.</span>
          </div>
        </div>

        {/* Muscle Cards */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-20 bg-zinc-900 rounded-2xl animate-pulse border border-zinc-800"
              />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-zinc-700"
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
            <h2 className="text-lg font-semibold text-zinc-400 mb-2">
              Нет данных
            </h2>
            <p className="text-sm text-zinc-600">
              Добавь первую тренировку, чтобы увидеть аналитику
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((item) => {
              const { text: lastTrainedText, daysAgo } = formatLastTrained(
                item.lastTrainedAt
              );
              const statusColor = getStatusColor(daysAgo);

              return (
                <div
                  key={item.muscleGroupId}
                  className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-white mb-1">
                      {item.muscleGroupName}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <svg
                          className="w-3.5 h-3.5"
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
                        <span>{lastTrainedText}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                          />
                        </svg>
                        <span>{item.sessionsCount} тр.</span>
                      </div>
                      {item.exercisesInLastSession > 0 && (
                        <div className="flex items-center gap-1.5">
                          <svg
                            className="w-3.5 h-3.5"
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
                          <span>{item.exercisesInLastSession} упр.</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${statusColor}`} />
                </div>
              );
            })}
          </div>
        )}
      </main>

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
