import { createClient } from "@/lib/supabase/client";

export interface ExerciseStats {
  exerciseId: string;
  exerciseName: string;
  lastWeight: number;
  lastReps: number;
  maxWeight: number;
  maxReps: number;
  lastDate: string;
}

/**
 * Получает последние показатели для упражнения
 * Используется в активной тренировке для подсказок
 */
export async function getExerciseStats(
  exerciseId: string
): Promise<ExerciseStats | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Получаем все подходы для этого упражнения
  const { data: workoutExercises } = await supabase
    .from("workout_exercises")
    .select(
      `
      exercise_id,
      exercises (
        id,
        name
      ),
      workout_sessions!inner (
        user_id,
        performed_at
      ),
      workout_sets (
        weight,
        reps
      )
    `
    )
    .eq("exercise_id", exerciseId)
    .eq("workout_sessions.user_id", user.id)
    .order("workout_sessions(performed_at)", { ascending: false })
    .limit(10);

  if (!workoutExercises || workoutExercises.length === 0) return null;

  let lastWeight = 0;
  let lastReps = 0;
  let maxWeight = 0;
  let maxReps = 0;
  let lastDate = "";
  let exerciseName = "";

  interface WorkoutExerciseData {
    exercises: { id: string; name: string } | null;
    workout_sessions: { performed_at: string };
    workout_sets: { weight: number; reps: number }[] | null;
  }

  workoutExercises.forEach((we: WorkoutExerciseData, index: number) => {
    if (!exerciseName && we.exercises?.name) {
      exerciseName = we.exercises.name;
    }

    if (index === 0) {
      lastDate = we.workout_sessions.performed_at;
    }

    we.workout_sets?.forEach((set, setIndex) => {
      // Последний подход (первый в первой тренировке)
      if (index === 0 && setIndex === 0) {
        lastWeight = set.weight;
        lastReps = set.reps;
      }

      // Максимальный вес
      if (set.weight > maxWeight) {
        maxWeight = set.weight;
        maxReps = set.reps;
      }
    });
  });

  return {
    exerciseId,
    exerciseName,
    lastWeight,
    lastReps,
    maxWeight,
    maxReps,
    lastDate,
  };
}

/**
 * Получает показатели для нескольких упражнений
 */
export async function getMultipleExerciseStats(
  exerciseIds: string[]
): Promise<Map<string, ExerciseStats>> {
  const result = new Map<string, ExerciseStats>();

  await Promise.all(
    exerciseIds.map(async (id) => {
      const stats = await getExerciseStats(id);
      if (stats) {
        result.set(id, stats);
      }
    })
  );

  return result;
}

/**
 * Получает отслеживаемые упражнения из localStorage
 */
export function getTrackedExerciseIds(): string[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem("trackedExerciseIds");
  return saved ? JSON.parse(saved) : [];
}
