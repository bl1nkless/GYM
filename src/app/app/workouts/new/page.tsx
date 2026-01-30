"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExercisePickerModal } from "@/components/workouts/ExercisePickerModal";
import { ExerciseBlock } from "@/components/workouts/ExerciseBlock";
import { createClient } from "@/lib/supabase/client";
import type {
  WorkoutExerciseLocal,
  ExerciseWithMuscleGroup,
  PerceivedDifficulty,
} from "@/types/database.types";

interface WorkoutSetRow {
  id: string;
  weight: number;
  reps: number;
  is_warmup: boolean;
  set_index: number;
}

interface WorkoutExerciseRow {
  id: string;
  order_index: number;
  perceived_difficulty: PerceivedDifficulty | null;
  note: string | null;
  exercises: ExerciseWithMuscleGroup;
  workout_sets: WorkoutSetRow[];
}

interface ActiveWorkoutSessionRow {
  id: string;
  name: string | null;
  workout_exercises: WorkoutExerciseRow[];
}

function parseAlternativeNote(note: string | null): {
  alternativeExerciseId: string | null;
  alternativeWeight: number | null;
} {
  if (!note) {
    return { alternativeExerciseId: null, alternativeWeight: null };
  }

  try {
    const parsed = JSON.parse(note) as {
      alternativeExerciseId?: string;
      alternativeWeight?: number | string | null;
    };

    const alternativeExerciseId =
      typeof parsed.alternativeExerciseId === "string"
        ? parsed.alternativeExerciseId
        : null;
    const alternativeWeight =
      parsed.alternativeWeight === null ||
      parsed.alternativeWeight === undefined
        ? null
        : typeof parsed.alternativeWeight === "number"
          ? parsed.alternativeWeight
          : Number.isNaN(Number(parsed.alternativeWeight))
            ? null
            : Number(parsed.alternativeWeight);

    return { alternativeExerciseId, alternativeWeight };
  } catch {
    return { alternativeExerciseId: null, alternativeWeight: null };
  }
}

function buildAlternativeNote(
  alternativeExerciseId: string | null,
  alternativeWeight: number | null,
): string | null {
  if (!alternativeExerciseId) {
    return null;
  }

  return JSON.stringify({
    alternativeExerciseId,
    alternativeWeight,
  });
}

function NewWorkoutContent() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<WorkoutExerciseLocal[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workoutName, setWorkoutName] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const supabase = createClient();

  // Create or restore workout session on page load
  useEffect(() => {
    let cancelled = false;

    async function initSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const storedSessionId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("activeWorkoutId")
          : null;

      if (storedSessionId) {
        const { data: existingSession, error: existingError } = await supabase
          .from("workout_sessions")
          .select(
            `
            id,
            name,
            workout_exercises (
              id,
              order_index,
              perceived_difficulty,
              note,
              exercises (
                *,
                muscle_groups (*)
              ),
              workout_sets (
                id,
                weight,
                reps,
                is_warmup,
                set_index
              )
            )
          `,
          )
          .eq("id", storedSessionId)
          .eq("user_id", user.id)
          .eq("is_completed", false)
          .single();

        if (!existingError && existingSession) {
          const session = existingSession as ActiveWorkoutSessionRow;
          const sortedExercises = (session.workout_exercises || [])
            .slice()
            .sort((a, b) => a.order_index - b.order_index);

          const alternativeByExerciseId = new Map<
            string,
            {
              alternativeExerciseId: string | null;
              alternativeWeight: number | null;
            }
          >();
          const alternativeIds: string[] = [];

          sortedExercises.forEach((we) => {
            const parsed = parseAlternativeNote(we.note);
            alternativeByExerciseId.set(we.id, parsed);
            if (parsed.alternativeExerciseId) {
              alternativeIds.push(parsed.alternativeExerciseId);
            }
          });

          const alternativeMap = new Map<string, ExerciseWithMuscleGroup>();
          if (alternativeIds.length > 0) {
            const { data: alternativeExercises } = await supabase
              .from("exercises")
              .select(
                `
                *,
                muscle_groups (*)
              `,
              )
              .in("id", alternativeIds);

            (alternativeExercises || []).forEach((exercise) => {
              alternativeMap.set(
                exercise.id,
                exercise as ExerciseWithMuscleGroup,
              );
            });
          }

          const restoredExercises: WorkoutExerciseLocal[] = sortedExercises.map(
            (we) => {
              const alternative = alternativeByExerciseId.get(we.id);
              const alternativeExercise = alternative?.alternativeExerciseId
                ? (alternativeMap.get(alternative.alternativeExerciseId) ??
                  null)
                : null;

              return {
                id: we.id,
                exercise: we.exercises,
                perceivedDifficulty: we.perceived_difficulty,
                sets: (we.workout_sets || [])
                  .slice()
                  .sort((a, b) => a.set_index - b.set_index)
                  .map((set) => ({
                    id: set.id,
                    weight: set.weight,
                    reps: set.reps,
                    isWarmup: set.is_warmup,
                    isSaved: true,
                  })),
                recommendedWeight: null,
                alternativeExercise,
                alternativeWeight: alternativeExercise
                  ? (alternative?.alternativeWeight ?? null)
                  : null,
                isSaved: true,
              };
            },
          );

          if (!cancelled) {
            setSessionId(session.id);
            setWorkoutName(session.name || "");
            setExercises(restoredExercises);
            setLoading(false);
          }
          return;
        }

        window.localStorage.removeItem("activeWorkoutId");
        window.dispatchEvent(new Event("active-workout-change"));
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
        if (!cancelled) setLoading(false);
        return;
      }

      window.localStorage.setItem("activeWorkoutId", data.id);
      window.dispatchEvent(new Event("active-workout-change"));

      // If template ID is provided, load exercises from template
      if (templateId) {
        const { data: templateData } = await supabase
          .from("workout_templates")
          .select(
            `
            name,
            workout_template_exercises (
              order_index,
              exercises (
                *,
                muscle_groups (*)
              )
            )
          `,
          )
          .eq("id", templateId)
          .single();

        if (templateData) {
          // Set workout name from template
          if (templateData.name) {
            await supabase
              .from("workout_sessions")
              .update({ name: templateData.name })
              .eq("id", data.id);
            if (!cancelled) setWorkoutName(templateData.name);
          }

          // Sort template exercises by order_index
          const sortedTemplateExercises = (
            templateData.workout_template_exercises || []
          )
            .slice()
            .sort(
              (a: { order_index: number }, b: { order_index: number }) =>
                a.order_index - b.order_index,
            );

          // Add each exercise from template to the workout
          const addedExercises: WorkoutExerciseLocal[] = [];

          for (let i = 0; i < sortedTemplateExercises.length; i++) {
            const templateExercise = sortedTemplateExercises[i];
            const exercise =
              templateExercise.exercises as ExerciseWithMuscleGroup;

            if (!exercise) continue;

            const { data: weData, error: weError } = await supabase
              .from("workout_exercises")
              .insert({
                workout_id: data.id,
                exercise_id: exercise.id,
                order_index: i,
                perceived_difficulty: null,
              })
              .select()
              .single();

            if (weError || !weData) {
              console.error("Error adding exercise from template:", weError);
              continue;
            }

            addedExercises.push({
              id: weData.id,
              exercise,
              perceivedDifficulty: null,
              sets: [
                {
                  id: `temp-${Date.now()}-${i}`,
                  weight: null,
                  reps: null,
                  isWarmup: false,
                  isSaved: false,
                },
              ],
              recommendedWeight: null,
              alternativeExercise: null,
              alternativeWeight: null,
              isSaved: true,
            });
          }

          if (!cancelled && addedExercises.length > 0) {
            setExercises(addedExercises);
          }
        }
      }

      if (!cancelled) {
        setSessionId(data.id);
        setLoading(false);
      }
    }

    initSession();
    return () => {
      cancelled = true;
    };
  }, [supabase, router, templateId]);

  // Get recommended weight based on history
  const getRecommendedWeight = useCallback(
    async (exerciseId: string): Promise<number | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("workout_exercises")
        .select(
          `
          perceived_difficulty,
          workout_sessions!inner (user_id, performed_at),
          workout_sets (weight, reps, is_warmup)
        `,
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

      const prevWeight = workingSets[workingSets.length - 1].weight;
      const step = 2.5;

      switch (lastWorkout.perceived_difficulty) {
        case "easy":
          return prevWeight + step;
        case "hard":
        case "ok":
        default:
          return prevWeight;
      }
    },
    [supabase],
  );

  // Add exercise to workout
  const handleSelectExercise = useCallback(
    async (exercise: ExerciseWithMuscleGroup) => {
      if (!sessionId) return;

      const orderIndex = exercises.length;

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

      const recommendedWeight = await getRecommendedWeight(exercise.id);

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
        alternativeExercise: null,
        alternativeWeight: null,
        isSaved: true,
      };

      setExercises((prev) => [...prev, newExercise]);
      setShowExercisePicker(false);
    },
    [sessionId, exercises.length, supabase, getRecommendedWeight],
  );

  const handleUpdateSets = useCallback(
    (exerciseId: string, sets: WorkoutExerciseLocal["sets"]) => {
      setExercises((prev) =>
        prev.map((ex) => (ex.id === exerciseId ? { ...ex, sets } : ex)),
      );
    },
    [],
  );

  const handleUpdateDifficulty = useCallback(
    async (exerciseId: string, difficulty: PerceivedDifficulty) => {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exerciseId
            ? { ...ex, perceivedDifficulty: difficulty }
            : ex,
        ),
      );

      await supabase
        .from("workout_exercises")
        .update({ perceived_difficulty: difficulty })
        .eq("id", exerciseId);
    },
    [supabase],
  );

  const saveAlternativeNote = useCallback(
    async (
      exerciseId: string,
      alternativeExerciseId: string | null,
      alternativeWeight: number | null,
    ) => {
      const note = buildAlternativeNote(
        alternativeExerciseId,
        alternativeWeight,
      );

      const { error } = await supabase
        .from("workout_exercises")
        .update({ note })
        .eq("id", exerciseId);

      if (error) {
        console.error("Error saving alternative exercise:", error);
      }
    },
    [supabase],
  );

  const handleReplaceExercise = useCallback(
    async (exerciseId: string, newExercise: ExerciseWithMuscleGroup) => {
      const { error } = await supabase
        .from("workout_exercises")
        .update({
          exercise_id: newExercise.id,
          perceived_difficulty: null,
          note: null,
        })
        .eq("id", exerciseId);

      if (error) {
        console.error("Error replacing exercise:", error);
        return;
      }

      const recommendedWeight = await getRecommendedWeight(newExercise.id);

      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                exercise: newExercise,
                perceivedDifficulty: null,
                recommendedWeight,
                alternativeExercise: null,
                alternativeWeight: null,
              }
            : ex,
        ),
      );
    },
    [supabase, getRecommendedWeight],
  );

  const handleSetAlternative = useCallback(
    async (exerciseId: string, newExercise: ExerciseWithMuscleGroup) => {
      const recommendedWeight = await getRecommendedWeight(newExercise.id);

      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                alternativeExercise: newExercise,
                alternativeWeight: recommendedWeight,
              }
            : ex,
        ),
      );

      await saveAlternativeNote(exerciseId, newExercise.id, recommendedWeight);
    },
    [getRecommendedWeight, saveAlternativeNote],
  );

  const handleClearAlternative = useCallback(
    async (exerciseId: string) => {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exerciseId
            ? { ...ex, alternativeExercise: null, alternativeWeight: null }
            : ex,
        ),
      );

      await saveAlternativeNote(exerciseId, null, null);
    },
    [saveAlternativeNote],
  );

  const handleUpdateAlternativeWeight = useCallback(
    (exerciseId: string, weight: number | null) => {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exerciseId ? { ...ex, alternativeWeight: weight } : ex,
        ),
      );
    },
    [],
  );

  const handleSaveAlternativeWeight = useCallback(
    async (exerciseId: string, weight: number | null) => {
      const exercise = exercises.find((ex) => ex.id === exerciseId);
      const alternativeExerciseId = exercise?.alternativeExercise?.id ?? null;
      if (!alternativeExerciseId) return;

      await saveAlternativeNote(exerciseId, alternativeExerciseId, weight);
    },
    [exercises, saveAlternativeNote],
  );

  const handleDeleteExercise = useCallback(
    async (exerciseId: string) => {
      await supabase.from("workout_exercises").delete().eq("id", exerciseId);
      setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
    },
    [supabase],
  );

  const handleSaveSet = useCallback(
    async (
      workoutExerciseId: string,
      setIndex: number,
      weight: number,
      reps: number,
      isWarmup: boolean,
      tempId?: string,
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

      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === workoutExerciseId
            ? {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.id === tempId || s.id === data.id
                    ? { ...s, id: data.id, isSaved: true }
                    : s,
                ),
              }
            : ex,
        ),
      );
    },
    [supabase],
  );

  const handleFinishWorkout = async () => {
    if (!sessionId) return;

    setSaving(true);

    // Save all unsaved sets
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
            set.id,
          );
        }
      }
    }

    // Update workout name and status
    await supabase
      .from("workout_sessions")
      .update({
        name: workoutName || null,
        is_completed: true,
      })
      .eq("id", sessionId);

    window.localStorage.removeItem("activeWorkoutId");
    window.dispatchEvent(new Event("active-workout-change"));
    router.push("/app/workouts");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 pt-12 pb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <Link
              href="/app/workouts"
              className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-zinc-800"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-white">Новая тренировка</h1>
          </div>

          {exercises.length > 0 && (
            <button
              onClick={handleFinishWorkout}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              Готово
            </button>
          )}
        </div>
      </header>

      <main className="px-4 pt-6 max-w-2xl mx-auto space-y-6">
        {/* Workout Name */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">
            Название
          </label>
          <input
            type="text"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="Название тренировки (опционально)"
            className="w-full h-12 px-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Exercise List */}
        <div className="space-y-4">
          {exercises.map((exercise) => (
            <ExerciseBlock
              key={exercise.id}
              exercise={exercise}
              onUpdateSets={(sets) => handleUpdateSets(exercise.id, sets)}
              onUpdateDifficulty={(d) => handleUpdateDifficulty(exercise.id, d)}
              onReplaceExercise={(newExercise) =>
                handleReplaceExercise(exercise.id, newExercise)
              }
              onSetAlternative={(newExercise) =>
                handleSetAlternative(exercise.id, newExercise)
              }
              onClearAlternative={() => handleClearAlternative(exercise.id)}
              onUpdateAlternativeWeight={(weight) =>
                handleUpdateAlternativeWeight(exercise.id, weight)
              }
              onSaveAlternativeWeight={(weight) =>
                handleSaveAlternativeWeight(exercise.id, weight)
              }
              onDelete={() => handleDeleteExercise(exercise.id)}
              onSaveSet={(setIndex, weight, reps, isWarmup, tempId) =>
                handleSaveSet(
                  exercise.id,
                  setIndex,
                  weight,
                  reps,
                  isWarmup,
                  tempId,
                )
              }
            />
          ))}
        </div>

        {/* Add Exercise Button */}
        <button
          onClick={() => setShowExercisePicker(true)}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-zinc-800 text-zinc-500 font-semibold hover:border-orange-500/50 hover:text-orange-400 hover:bg-orange-500/10 transition-all duration-200 flex items-center justify-center gap-2"
        >
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
          Добавить упражнение
        </button>
      </main>

      {/* Exercise Picker Modal */}
      {showExercisePicker && (
        <ExercisePickerModal
          onSelect={handleSelectExercise}
          onClose={() => setShowExercisePicker(false)}
        />
      )}
    </div>
  );
}

export default function NewWorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <NewWorkoutContent />
    </Suspense>
  );
}
