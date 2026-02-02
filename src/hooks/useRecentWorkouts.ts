"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/hooks/useWorkoutTimer";

export interface RecentWorkout {
  id: string;
  title: string;
  date: string;
  duration: string;
  volume: string;
  tags: string[];
  isPr: boolean;
}

interface WorkoutSessionRow {
  id: string;
  performed_at: string | null;
  name: string | null;
  duration_minutes?: number | null;
  workout_exercises: Array<{
    exercises: {
      muscle_groups: {
        name: string;
      } | null;
    } | null;
    workout_sets: Array<{
      weight: number | null;
      reps: number | null;
    } | null> | null;
  }> | null;
}

const WORKOUTS_SELECT = `
  id,
  performed_at,
  name,
  duration_minutes,
  workout_exercises (
    exercises (
      muscle_groups ( name )
    ),
    workout_sets (
      weight,
      reps
    )
  )
`;

export const WORKOUTS_PREVIEW_LIMIT = 10;

const calcTonnage = (session: WorkoutSessionRow) => {
  let totalTonnage = 0;

  session.workout_exercises?.forEach((exercise) => {
    exercise?.workout_sets?.forEach((set) => {
      if (set?.weight && set?.reps) {
        totalTonnage += set.weight * set.reps;
      }
    });
  });

  return totalTonnage;
};

const extractMuscleTags = (session: WorkoutSessionRow) => {
  const uniqueTags = new Set<string>();

  session.workout_exercises?.forEach((exercise) => {
    const muscleName = exercise?.exercises?.muscle_groups?.name;
    if (muscleName) {
      uniqueTags.add(muscleName);
    }
  });

  return Array.from(uniqueTags);
};

const formatPerformedAt = (performedAt: string | null) => {
  if (!performedAt) return "-";
  const dateObj = new Date(performedAt);
  return dateObj.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatWorkoutSession = (session: WorkoutSessionRow): RecentWorkout => {
  const totalTonnage = calcTonnage(session);
  const tags = extractMuscleTags(session);

  return {
    id: session.id,
    title: session.name || "Тренировка",
    date: formatPerformedAt(session.performed_at),
    duration: session.duration_minutes
      ? formatDuration(session.duration_minutes)
      : "—",
    volume: totalTonnage > 0 ? `${(totalTonnage / 1000).toFixed(1)} т` : "-",
    tags: tags.slice(0, 2),
    isPr: false,
  };
};

export function useRecentWorkouts(limit = WORKOUTS_PREVIEW_LIMIT) {
  const supabase = useMemo(() => createClient(), []);
  const [workouts, setWorkouts] = useState<RecentWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true; // Reset on mount for client-side navigation
    return () => {
      alive.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!alive.current) return;
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      if (userError) {
        console.error("Error loading workouts user:", userError);
      }
      if (alive.current) {
        setWorkouts([]);
        setLoading(false);
      }
      return;
    }

    const { data, error } = await supabase
      .from("workout_sessions")
      .select(WORKOUTS_SELECT)
      .eq("user_id", user.id)
      .eq("is_completed", true)
      .order("performed_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error loading workouts:", error);
      if (alive.current) {
        setWorkouts([]);
        setLoading(false);
      }
      return;
    }

    const formatted = (data ?? []).map((session) =>
      formatWorkoutSession(session as WorkoutSessionRow)
    );

    if (alive.current) {
      setWorkouts(formatted);
      setLoading(false);
    }
  }, [supabase, limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { workouts, loading, reload };
}
