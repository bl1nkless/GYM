"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================================
// Схемы валидации
// ============================================================================

const SaveBodyWeightSchema = z.object({
  weight: z.number().min(20).max(300),
  goalWeight: z.number().min(20).max(300),
});

const ToggleTrackedExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  isTracked: z.boolean(),
});

const AddWorkoutSetSchema = z.object({
  workoutExerciseId: z.string().min(1),
  weight: z.number().min(0).max(2000),
  reps: z.number().int().min(1).max(1000).optional(),
});

// ============================================================================
// Типы результатов
// ============================================================================

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ============================================================================
// Серверные экшены
// ============================================================================

/**
 * Сохраняет вес тела пользователя.
 * На данный момент данные хранятся в localStorage на клиенте,
 * но эта функция подготовлена для миграции на серверное хранение.
 */
export async function saveBodyWeight(
  input: unknown
): Promise<ActionResult<{ weight: number; goalWeight: number }>> {
  try {
    const data = SaveBodyWeightSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Необходима авторизация" };
    }

    // TODO: Когда будет таблица user_profile с полями weight/goalWeight
    // const { error } = await supabase
    //   .from("user_profiles")
    //   .upsert({
    //     user_id: user.id,
    //     current_weight: data.weight,
    //     goal_weight: data.goalWeight,
    //     updated_at: new Date().toISOString(),
    //   });
    //
    // if (error) {
    //   return { success: false, error: error.message };
    // }

    return { success: true, data };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: "Некорректные данные" };
    }
    return { success: false, error: "Ошибка сохранения" };
  }
}

/**
 * Переключает отслеживание упражнения.
 * Сейчас хранится в localStorage, подготовлено для БД.
 */
export async function toggleTrackedExercise(
  input: unknown
): Promise<ActionResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const parsed = ToggleTrackedExerciseSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Необходима авторизация" };
    }

    // TODO: Когда будет таблица tracked_exercises
    // if (data.isTracked) {
    //   await supabase.from("tracked_exercises").insert({
    //     user_id: user.id,
    //     exercise_id: data.exerciseId,
    //   });
    // } else {
    //   await supabase.from("tracked_exercises")
    //     .delete()
    //     .eq("user_id", user.id)
    //     .eq("exercise_id", data.exerciseId);
    // }

    revalidatePath("/app/analytics");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: "Некорректные данные" };
    }
    return { success: false, error: "Ошибка обновления" };
  }
}

/**
 * Добавляет подход к упражнению в тренировке.
 */
export async function addWorkoutSet(input: unknown): Promise<ActionResult> {
  try {
    const data = AddWorkoutSetSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Необходима авторизация" };
    }

    const { error } = await supabase.from("workout_sets").insert({
      workout_exercise_id: data.workoutExerciseId,
      weight: data.weight,
      reps: data.reps ?? 1, // Дефолт 1 если не указано
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/app/analytics");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: "Некорректные данные" };
    }
    return { success: false, error: "Ошибка добавления подхода" };
  }
}

/**
 * Загружает историю упражнений для пользователя.
 * Серверный экшен для загрузки данных (вместо клиентского fetch).
 */
export async function getExerciseHistory(exerciseIds: string[]) {
  try {
    if (exerciseIds.length === 0) {
      return { success: true, data: [] };
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Необходима авторизация", data: [] };
    }

    const { data: workoutExercises, error } = await supabase
      .from("workout_exercises")
      .select(
        `
        exercise_id,
        exercises (name, muscle_groups (name)),
        workout_sessions!inner (user_id, performed_at),
        workout_sets (weight)
      `
      )
      .in("exercise_id", exerciseIds)
      .eq("workout_sessions.user_id", user.id);

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: workoutExercises ?? [] };
  } catch {
    return { success: false, error: "Ошибка загрузки истории", data: [] };
  }
}
