"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { ExercisePickerModal } from "@/components/workouts/ExercisePickerModal";
import { ExerciseBlock } from "@/components/workouts/ExerciseBlock";
import { createClient } from "@/lib/supabase/client";
import { Plus, Check, Loader2, Save } from "lucide-react";
import type {
  WorkoutExerciseLocal,
  ExerciseWithMuscleGroup,
  PerceivedDifficulty,
} from "@/types/database.types";

export default function NewWorkoutPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<WorkoutExerciseLocal[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workoutName, setWorkoutName] = useState("");

  const router = useRouter();
  const supabase = createClient();

  // Создаём сессию тренировки при загрузке страницы
  useEffect(() => {
    async function createSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          performed_at: new Date().toISOString(),
          name: null,
          is_completed: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating session:", error);
        return;
      }

      setSessionId(data.id);
      setLoading(false);
    }

    createSession();
  }, [supabase, router]);

  // Получить рекомендованный вес на основе истории
  const getRecommendedWeight = useCallback(
    async (exerciseId: string): Promise<number | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Находим последнюю тренировку с этим упражнением
      const { data } = await supabase
        .from("workout_exercises")
        .select(
          `
        perceived_difficulty,
        workout_sessions!inner (
          user_id,
          performed_at
        ),
        workout_sets (
          weight,
          reps,
          is_warmup
        )
      `
        )
        .eq("exercise_id", exerciseId)
        .eq("workout_sessions.user_id", user.id)
        .order("workout_sessions(performed_at)", { ascending: false })
        .limit(1);

      if (!data || data.length === 0) return null;

      const lastWorkout = data[0];
      const workingSets = (lastWorkout.workout_sets || [])
        .filter((s: { is_warmup: boolean }) => !s.is_warmup)
        .filter((s: { weight: number | null }) => s.weight !== null);

      if (workingSets.length === 0) return null;

      // Берём вес последнего рабочего подхода
      const prevWeight = workingSets[workingSets.length - 1].weight;
      const step = 2.5;

      switch (lastWorkout.perceived_difficulty) {
        case "easy":
          return prevWeight + step;
        case "hard":
          return prevWeight; // Оставляем тот же
        case "ok":
        default:
          return prevWeight;
      }
    },
    [supabase]
  );

  // Добавить упражнение в тренировку
  const handleSelectExercise = useCallback(
    async (exercise: ExerciseWithMuscleGroup) => {
      if (!sessionId) return;

      const orderIndex = exercises.length;

      // Создаём workout_exercise в БД
      const { data, error } = await supabase
        .from("workout_exercises")
        .insert({
          workout_id: sessionId,
          exercise_id: exercise.id,
          order_index: orderIndex,
          perceived_difficulty: null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding exercise:", error);
        return;
      }

      // Получаем рекомендованный вес
      const recommendedWeight = await getRecommendedWeight(exercise.id);

      // Добавляем в локальный стейт
      const newExercise: WorkoutExerciseLocal = {
        id: data.id,
        exercise,
        perceivedDifficulty: null,
        sets: [
          {
            id: `temp-${Date.now()}`,
            weight: recommendedWeight,
            reps: null,
            isWarmup: false,
            isSaved: false,
          },
        ],
        recommendedWeight,
        isSaved: true,
      };

      setExercises((prev) => [...prev, newExercise]);
      setShowExercisePicker(false);
    },
    [sessionId, exercises.length, supabase, getRecommendedWeight]
  );

  // Обновить подходы упражнения
  const handleUpdateSets = useCallback(
    (exerciseId: string, sets: WorkoutExerciseLocal["sets"]) => {
      setExercises((prev) =>
        prev.map((ex) => (ex.id === exerciseId ? { ...ex, sets } : ex))
      );
    },
    []
  );

  // Обновить ощущение от упражнения
  const handleUpdateDifficulty = useCallback(
    async (exerciseId: string, difficulty: PerceivedDifficulty) => {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exerciseId ? { ...ex, perceivedDifficulty: difficulty } : ex
        )
      );

      await supabase
        .from("workout_exercises")
        .update({ perceived_difficulty: difficulty })
        .eq("id", exerciseId);
    },
    [supabase]
  );

  // Удалить упражнение
  const handleDeleteExercise = useCallback(
    async (exerciseId: string) => {
      await supabase.from("workout_exercises").delete().eq("id", exerciseId);

      setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
    },
    [supabase]
  );

  // Сохранить подход в БД
  const handleSaveSet = useCallback(
    async (
      workoutExerciseId: string,
      setIndex: number,
      weight: number,
      reps: number,
      isWarmup: boolean,
      tempId?: string
    ) => {
      const { data, error } = await supabase
        .from("workout_sets")
        .insert({
          workout_exercise_id: workoutExerciseId,
          set_index: setIndex,
          weight,
          reps,
          is_warmup: isWarmup,
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving set:", error);
        return;
      }

      // Обновляем ID в локальном стейте
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === workoutExerciseId
            ? {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.id === tempId || s.id === data.id
                    ? { ...s, id: data.id, isSaved: true }
                    : s
                ),
              }
            : ex
        )
      );
    },
    [supabase]
  );

  // Завершить тренировку
  const handleFinishWorkout = async () => {
    if (!sessionId) return;

    setSaving(true);

    // Сохраняем все несохранённые подходы
    for (const exercise of exercises) {
      for (let i = 0; i < exercise.sets.length; i++) {
        const set = exercise.sets[i];
        if (!set.isSaved && set.weight !== null && set.reps !== null) {
          await handleSaveSet(
            exercise.id,
            i,
            set.weight,
            set.reps,
            set.isWarmup,
            set.id
          );
        }
      }
    }

    // Обновляем название и статус тренировки
    await supabase
      .from("workout_sessions")
      .update({
        name: workoutName || null,
        is_completed: true,
      })
      .eq("id", sessionId);

    router.push("/app/workouts");
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: "60vh" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Новая тренировка"
        showBack
        action={
          exercises.length > 0 && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleFinishWorkout}
              disabled={saving}
            >
              {saving ? (
                <Loader2
                  size={16}
                  style={{ animation: "spin 0.8s linear infinite" }}
                />
              ) : (
                <Check size={16} />
              )}
              Готово
            </button>
          )
        }
      />

      {/* Название тренировки */}
      <div className="input-group mb-lg">
        <input
          type="text"
          className="input"
          placeholder="Название тренировки (опционально)"
          value={workoutName}
          onChange={(e) => setWorkoutName(e.target.value)}
        />
      </div>

      {/* Список упражнений */}
      <div className="flex flex-col gap-md mb-lg">
        {exercises.map((exercise) => (
          <ExerciseBlock
            key={exercise.id}
            exercise={exercise}
            onUpdateSets={(sets) => handleUpdateSets(exercise.id, sets)}
            onUpdateDifficulty={(d) => handleUpdateDifficulty(exercise.id, d)}
            onDelete={() => handleDeleteExercise(exercise.id)}
            onSaveSet={(setIndex, weight, reps, isWarmup, tempId) =>
              handleSaveSet(
                exercise.id,
                setIndex,
                weight,
                reps,
                isWarmup,
                tempId
              )
            }
          />
        ))}
      </div>

      {/* Кнопка добавления упражнения */}
      <button
        className="btn btn-secondary btn-wide"
        onClick={() => setShowExercisePicker(true)}
      >
        <Plus size={20} />
        Добавить упражнение
      </button>

      {/* Модалка выбора упражнения */}
      {showExercisePicker && (
        <ExercisePickerModal
          onSelect={handleSelectExercise}
          onClose={() => setShowExercisePicker(false)}
        />
      )}
    </>
  );
}
