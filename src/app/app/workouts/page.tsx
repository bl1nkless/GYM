"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { createClient } from "@/lib/supabase/client";
import { Calendar, ChevronRight, Dumbbell } from "lucide-react";
import type { WorkoutSessionWithDetails } from "@/types/database.types";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  if (diffDays < 7) return `${diffDays} дн. назад`;

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface WorkoutCardData {
  id: string;
  performed_at: string;
  name: string | null;
  exercises: Array<{
    name: string;
    muscle_group: string;
    sets_count: number;
  }>;
  total_sets: number;
}

function WorkoutCard({ workout }: { workout: WorkoutCardData }) {
  return (
    <Link
      href={`/app/workouts/${workout.id}`}
      className="card card-interactive workout-card animate-slide-in"
    >
      <div className="workout-card-header">
        <div className="flex items-center gap-sm">
          <Calendar size={14} className="text-muted" />
          <span className="workout-date">
            {formatDate(workout.performed_at)}
          </span>
          <span className="text-muted">·</span>
          <span className="workout-date">
            {formatTime(workout.performed_at)}
          </span>
        </div>
        <ChevronRight size={18} className="text-muted" />
      </div>

      <h3 className="workout-title">{workout.name || "Тренировка"}</h3>

      {workout.exercises.length > 0 && (
        <div className="workout-exercises-preview">
          {workout.exercises.slice(0, 4).map((ex, i) => (
            <span key={i} className="badge">
              {ex.name}
            </span>
          ))}
          {workout.exercises.length > 4 && (
            <span className="badge">+{workout.exercises.length - 4}</span>
          )}
        </div>
      )}

      <div className="text-caption mt-sm">
        {workout.exercises.length} упр. · {workout.total_sets} подходов
      </div>
    </Link>
  );
}

function EmptyWorkouts() {
  return (
    <div className="empty-state">
      <Dumbbell className="empty-icon" />
      <h2 className="empty-title">Нет тренировок</h2>
      <p className="empty-description">
        Начни свой путь к результатам — добавь первую тренировку!
      </p>
      <Link href="/app/workouts/new" className="btn btn-primary">
        Начать тренировку
      </Link>
    </div>
  );
}

function WorkoutsSkeleton() {
  return (
    <div className="flex flex-col gap-md">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card">
          <div
            className="skeleton"
            style={{
              width: "40%",
              height: 16,
              marginBottom: "var(--space-sm)",
            }}
          />
          <div
            className="skeleton"
            style={{
              width: "60%",
              height: 24,
              marginBottom: "var(--space-md)",
            }}
          />
          <div className="flex gap-xs">
            <div
              className="skeleton"
              style={{
                width: 60,
                height: 24,
                borderRadius: "var(--radius-full)",
              }}
            />
            <div
              className="skeleton"
              style={{
                width: 80,
                height: 24,
                borderRadius: "var(--radius-full)",
              }}
            />
            <div
              className="skeleton"
              style={{
                width: 50,
                height: 24,
                borderRadius: "var(--radius-full)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<WorkoutCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadWorkouts() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("workout_sessions")
        .select(
          `
          id,
          performed_at,
          name,
          workout_exercises (
            id,
            exercises (
              name,
              muscle_groups (
                name
              )
            ),
            workout_sets (
              id
            )
          )
        `
        )
        .eq("user_id", user.id)
        .order("performed_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("Error loading workouts:", error);
        setLoading(false);
        return;
      }

      const formatted: WorkoutCardData[] = (data || []).map((session) => ({
        id: session.id,
        performed_at: session.performed_at,
        name: session.name,
        exercises: (session.workout_exercises || []).map(
          (we: {
            exercises: { name: string; muscle_groups: { name: string } } | null;
            workout_sets: { id: string }[] | null;
          }) => ({
            name: we.exercises?.name || "Упражнение",
            muscle_group: we.exercises?.muscle_groups?.name || "",
            sets_count: we.workout_sets?.length || 0,
          })
        ),
        total_sets: (session.workout_exercises || []).reduce(
          (acc: number, we: { workout_sets: { id: string }[] | null }) =>
            acc + (we.workout_sets?.length || 0),
          0
        ),
      }));

      setWorkouts(formatted);
      setLoading(false);
    }

    loadWorkouts();
  }, [supabase]);

  return (
    <>
      <PageHeader title="Тренировки" />

      {loading ? (
        <WorkoutsSkeleton />
      ) : workouts.length === 0 ? (
        <EmptyWorkouts />
      ) : (
        <div className="flex flex-col gap-md">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      )}
    </>
  );
}
