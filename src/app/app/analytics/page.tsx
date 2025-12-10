"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Hash, Dumbbell } from "lucide-react";
import type { MuscleAnalytics } from "@/types/database.types";

const PERIOD_OPTIONS = [
  { days: 7, label: "7 дней" },
  { days: 30, label: "30 дней" },
  { days: 60, label: "60 дней" },
  { days: 90, label: "90 дней" },
];

function getStatusClass(daysAgo: number | null): string {
  if (daysAgo === null) return "";
  if (daysAgo <= 3) return "fresh";
  if (daysAgo <= 7) return "normal";
  return "overdue";
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

function MuscleCard({ data }: { data: MuscleAnalytics }) {
  const { text: lastTrainedText, daysAgo } = formatLastTrained(
    data.lastTrainedAt
  );
  const statusClass = getStatusClass(daysAgo);

  return (
    <div className="card muscle-card animate-slide-in">
      <div className="muscle-info">
        <span className="muscle-name">{data.muscleGroupName}</span>
        <div className="muscle-stats">
          <div className="muscle-stat">
            <Calendar size={12} />
            <span>{lastTrainedText}</span>
          </div>
          <div className="muscle-stat">
            <Hash size={12} />
            <span>{data.sessionsCount} тр.</span>
          </div>
          {data.exercisesInLastSession > 0 && (
            <div className="muscle-stat">
              <Dumbbell size={12} />
              <span>{data.exercisesInLastSession} упр.</span>
            </div>
          )}
        </div>
      </div>
      {statusClass && (
        <div className="muscle-status">
          <div className={`status-indicator ${statusClass}`} />
        </div>
      )}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-sm">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="card" style={{ padding: "var(--space-md)" }}>
          <div
            className="skeleton"
            style={{
              width: "40%",
              height: 20,
              marginBottom: "var(--space-sm)",
            }}
          />
          <div className="skeleton" style={{ width: "70%", height: 14 }} />
        </div>
      ))}
    </div>
  );
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

      // Получаем все тренировки пользователя за период с деталями
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

      // Получаем все мышечные группы
      const { data: muscleGroups } = await supabase
        .from("muscle_groups")
        .select("*")
        .order("order_index");

      if (!muscleGroups) {
        setLoading(false);
        return;
      }

      // Агрегируем данные по мышечным группам
      const analyticsMap = new Map<
        number,
        {
          lastTrainedAt: string | null;
          sessionsSet: Set<string>;
          lastSessionExercises: Set<string>;
        }
      >();

      // Инициализируем для всех групп
      muscleGroups.forEach((mg) => {
        analyticsMap.set(mg.id, {
          lastTrainedAt: null,
          sessionsSet: new Set(),
          lastSessionExercises: new Set(),
        });
      });

      // Группируем тренировки по мышечным группам
      const lastSessionByMuscle = new Map<number, string>();

      (workouts || []).forEach((session) => {
        (session.workout_exercises || []).forEach(
          (we: { exercises: { primary_muscle_group_id: number } | null }) => {
            const muscleId = we.exercises?.primary_muscle_group_id;
            if (!muscleId) return;

            const analytics = analyticsMap.get(muscleId);
            if (!analytics) return;

            // Обновляем последнюю тренировку
            if (
              !analytics.lastTrainedAt ||
              session.performed_at > analytics.lastTrainedAt
            ) {
              analytics.lastTrainedAt = session.performed_at;
              lastSessionByMuscle.set(muscleId, session.id);
            }

            // Добавляем сессию в подсчёт
            analytics.sessionsSet.add(session.id);
          }
        );
      });

      // Подсчитываем упражнения в последней тренировке
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

      // Формируем финальный массив
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

      // Сортируем: сначала те, что давно не тренировались
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
    <>
      <PageHeader title="Аналитика" />

      {/* Выбор периода */}
      <div className="analytics-period-selector">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.days}
            className={`period-btn ${
              periodDays === option.days ? "active" : ""
            }`}
            onClick={() => setPeriodDays(option.days)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Легенда */}
      <div
        className="flex gap-md mb-lg"
        style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}
      >
        <div className="flex items-center gap-xs">
          <div
            className="status-indicator fresh"
            style={{ width: 8, height: 8 }}
          />
          <span>≤ 3 дн.</span>
        </div>
        <div className="flex items-center gap-xs">
          <div
            className="status-indicator normal"
            style={{ width: 8, height: 8 }}
          />
          <span>4-7 дн.</span>
        </div>
        <div className="flex items-center gap-xs">
          <div
            className="status-indicator overdue"
            style={{ width: 8, height: 8 }}
          />
          <span>&gt; 7 дн.</span>
        </div>
      </div>

      {/* Карточки */}
      {loading ? (
        <AnalyticsSkeleton />
      ) : data.length === 0 ? (
        <div className="empty-state">
          <Dumbbell className="empty-icon" />
          <h2 className="empty-title">Нет данных</h2>
          <p className="empty-description">
            Добавь первую тренировку, чтобы увидеть аналитику по мышечным
            группам
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          {data.map((item) => (
            <MuscleCard key={item.muscleGroupId} data={item} />
          ))}
        </div>
      )}
    </>
  );
}
