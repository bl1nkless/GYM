/**
 * Алиасы для удобной работы с типами БД
 */
import type { Database } from "./database.types";

// Все таблицы
export type Tables = Database["public"]["Tables"];

// Строки таблиц (Row)
export type Exercise = Tables["exercises"]["Row"];
export type ExerciseInsert = Tables["exercises"]["Insert"];

export type MuscleGroup = Tables["muscle_groups"]["Row"];

export type WorkoutSession = Tables["workout_sessions"]["Row"];
export type WorkoutSessionInsert = Tables["workout_sessions"]["Insert"];
export type WorkoutSessionUpdate = Tables["workout_sessions"]["Update"];

export type WorkoutExercise = Tables["workout_exercises"]["Row"];
export type WorkoutExerciseInsert = Tables["workout_exercises"]["Insert"];

export type WorkoutSet = Tables["workout_sets"]["Row"];
export type WorkoutSetInsert = Tables["workout_sets"]["Insert"];
export type WorkoutSetUpdate = Tables["workout_sets"]["Update"];

export type WorkoutTemplate = Tables["workout_templates"]["Row"];
export type WorkoutTemplateInsert = Tables["workout_templates"]["Insert"];

export type WorkoutTemplateExercise =
  Tables["workout_template_exercises"]["Row"];
export type WorkoutTemplateExerciseInsert =
  Tables["workout_template_exercises"]["Insert"];

// Enum
export type PerceivedDifficulty =
  Database["public"]["Enums"]["perceived_difficulty"];

// Re-export Database для типизации клиента Supabase
export type { Database };

// =============================================================================
// Кастомные типы для UI (join-данные из нескольких таблиц)
// =============================================================================

/**
 * Упражнение с информацией о мышечной группе (join exercises + muscle_groups)
 */
export interface ExerciseWithMuscleGroup extends Exercise {
  muscle_groups: MuscleGroup | null;
}

/**
 * Локальное состояние подхода в UI
 */
export interface WorkoutSetLocal {
  id: string;
  weight: number | null;
  reps: number | null;
  isWarmup: boolean;
  isSaved: boolean;
}

/**
 * Локальное состояние упражнения в UI тренировки
 */
export interface WorkoutExerciseLocal {
  id: string;
  exercise: ExerciseWithMuscleGroup;
  perceivedDifficulty: PerceivedDifficulty | null;
  sets: WorkoutSetLocal[];
  recommendedWeight: number | null;
  alternativeExercise: ExerciseWithMuscleGroup | null;
  alternativeWeight: number | null;
  alternativeOptions: ExerciseWithMuscleGroup[] | null;
  isSaved: boolean;
}
