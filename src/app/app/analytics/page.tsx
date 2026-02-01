import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AnalyticsClient from "@/components/analytics/AnalyticsClient";
import { buildExerciseStats } from "@/lib/analytics/buildExerciseStats";
import type { ExerciseOption } from "@/components/analytics/ExerciseSelectionModal";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  // Проверяем авторизацию
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Загружаем все доступные упражнения пользователя
  const { data: availableData } = await supabase
    .from("workout_exercises")
    .select(
      `
      exercise_id,
      exercises (id, name, muscle_groups (name)),
      workout_sessions!inner (user_id)
    `,
    )
    .eq("workout_sessions.user_id", user.id);

  // Формируем уникальный список упражнений
  const exerciseMap = new Map<string, ExerciseOption>();
  interface AvailableExercise {
    exercise_id: string;
    exercises: {
      id: string;
      name: string;
      muscle_groups: { name: string } | null;
    } | null;
  }
  (availableData ?? []).forEach((we: AvailableExercise) => {
    if (we.exercises && !exerciseMap.has(we.exercise_id)) {
      exerciseMap.set(we.exercise_id, {
        id: we.exercises.id,
        name: we.exercises.name,
        muscleGroupName: we.exercises.muscle_groups?.name || "",
      });
    }
  });
  const availableExercises = Array.from(exerciseMap.values());

  // Подсчёт тренировок
  const { count: totalWorkouts } = await supabase
    .from("workout_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Начальные данные для отслеживаемых упражнений
  // (selectedIds будет загружен из localStorage на клиенте)
  // Для SSR передаём пустые начальные данные — клиент загрузит их из localStorage
  const initialStats: ReturnType<typeof buildExerciseStats> = [];

  return (
    <AnalyticsClient
      initialStats={initialStats}
      initialExercises={availableExercises}
      initialSelectedIds={[]}
      totalWorkouts={totalWorkouts ?? 0}
      userId={user.id}
    />
  );
}
