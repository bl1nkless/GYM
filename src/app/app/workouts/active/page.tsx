"use client";

import { useEffect, useState, useCallback, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExercisePickerModal } from "@/components/workouts/ExercisePickerModal";
import { ExerciseBlock } from "@/components/workouts/ExerciseBlock";
import { createClient } from "@/lib/supabase/client";
import { useTelegramWorkoutContext } from "@/components/providers/TelegramWorkoutProvider";
import type {
  WorkoutExerciseLocal,
  ExerciseWithMuscleGroup,
  PerceivedDifficulty,
} from "@/types";
import { useWorkoutTimer } from "@/hooks/useWorkoutTimer";

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
  started_at: string | null;
  workout_exercises: WorkoutExerciseRow[];
}

const ACTIVE_SESSION_SELECT = `
  id,
  name,
  started_at,
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
`;

function parseAlternativeNote(note: string | null): {
  alternativeExerciseId: string | null;
  alternativeWeight: number | null;
  allowedAlternativeIds: string[] | null;
} {
  if (!note) {
    return {
      alternativeExerciseId: null,
      alternativeWeight: null,
      allowedAlternativeIds: null,
    };
  }

  try {
    const parsed = JSON.parse(note) as {
      alternativeExerciseId?: string;
      alternativeWeight?: number | string | null;
      allowedAlternativeIds?: unknown;
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

    const allowedAlternativeIds = Array.isArray(parsed.allowedAlternativeIds)
      ? parsed.allowedAlternativeIds.filter(
          (id): id is string => typeof id === "string"
        )
      : null;

    return { alternativeExerciseId, alternativeWeight, allowedAlternativeIds };
  } catch {
    return {
      alternativeExerciseId: null,
      alternativeWeight: null,
      allowedAlternativeIds: null,
    };
  }
}

function buildAlternativeNote(
  alternativeExerciseId: string | null,
  alternativeWeight: number | null,
  allowedAlternativeIds?: string[] | null
): string | null {
  const hasAllowed = Array.isArray(allowedAlternativeIds);
  if (!alternativeExerciseId && !hasAllowed) {
    return null;
  }

  return JSON.stringify({
    alternativeExerciseId,
    alternativeWeight,
    ...(hasAllowed ? { allowedAlternativeIds } : {}),
  });
}

function NewWorkoutContent() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [exercises, setExercises] = useState<WorkoutExerciseLocal[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workoutName, setWorkoutName] = useState("");

  // Workout timer hook
  const { formattedTime } = useWorkoutTimer({
    startedAt,
    isActive: !saving,
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const resumeId = searchParams.get("resumeId");
  const supabase = useMemo(() => createClient(), []);
  const { markStarted, markFinished } = useTelegramWorkoutContext();

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

      const restoreSession = async (
        session: ActiveWorkoutSessionRow
      ): Promise<void> => {
        const sortedExercises = (session.workout_exercises || [])
          .slice()
          .sort((a, b) => a.order_index - b.order_index);

        const alternativeByExerciseId = new Map<
          string,
          {
            alternativeExerciseId: string | null;
            alternativeWeight: number | null;
            allowedAlternativeIds: string[] | null;
          }
        >();
        const alternativeIds: string[] = [];

        sortedExercises.forEach((we) => {
          const parsed = parseAlternativeNote(we.note);
          alternativeByExerciseId.set(we.id, parsed);
          if (parsed.alternativeExerciseId) {
            alternativeIds.push(parsed.alternativeExerciseId);
          }
          if (parsed.allowedAlternativeIds?.length) {
            alternativeIds.push(...parsed.allowedAlternativeIds);
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
            `
            )
            .in("id", alternativeIds);

          (alternativeExercises || []).forEach((exercise) => {
            alternativeMap.set(
              exercise.id,
              exercise as ExerciseWithMuscleGroup
            );
          });
        }

        const restoredExercises: WorkoutExerciseLocal[] = sortedExercises.map(
          (we) => {
            const alternative = alternativeByExerciseId.get(we.id);
            const alternativeExercise = alternative?.alternativeExerciseId
              ? (alternativeMap.get(alternative.alternativeExerciseId) ?? null)
              : null;
            const alternativeOptions = alternative?.allowedAlternativeIds
              ? alternative.allowedAlternativeIds
                  .map((id) => alternativeMap.get(id))
                  .filter((item): item is ExerciseWithMuscleGroup =>
                    Boolean(item)
                  )
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
              alternativeOptions,
              isSaved: true,
            };
          }
        );

        if (!cancelled) {
          setSessionId(session.id);
          setStartedAt(session.started_at ?? null);
          setWorkoutName(session.name || "");
          setExercises(restoredExercises);
          setLoading(false);
        }
      };

      const tryRestoreById = async (id: string): Promise<boolean> => {
        const { data: existingSession, error: existingError } = await supabase
          .from("workout_sessions")
          .select(ACTIVE_SESSION_SELECT)
          .eq("id", id)
          .eq("user_id", user.id)
          .eq("is_completed", false)
          .single();

        if (!existingError && existingSession) {
          const session = existingSession as ActiveWorkoutSessionRow;
          if (typeof window !== "undefined") {
            if (window.localStorage.getItem("activeWorkoutId") !== session.id) {
              window.localStorage.setItem("activeWorkoutId", session.id);
              window.dispatchEvent(new Event("active-workout-change"));
            }
          }
          await restoreSession(session);
          return true;
        }

        return false;
      };

      const allowAutoResume = !templateId && !resumeId;
      const candidateIds = new Set<string>();
      if (resumeId) candidateIds.add(resumeId);
      if (allowAutoResume && storedSessionId) candidateIds.add(storedSessionId);

      for (const id of candidateIds) {
        if (await tryRestoreById(id)) {
          return;
        }
      }

      if (allowAutoResume && storedSessionId && typeof window !== "undefined") {
        window.localStorage.removeItem("activeWorkoutId");
        window.dispatchEvent(new Event("active-workout-change"));
      }

      if (allowAutoResume) {
        const { data: activeSessions, error: activeError } = await supabase
          .from("workout_sessions")
          .select(ACTIVE_SESSION_SELECT)
          .eq("user_id", user.id)
          .eq("is_completed", false)
          .order("created_at", { ascending: false })
          .limit(1);

        if (!activeError && activeSessions && activeSessions.length > 0) {
          const session = activeSessions[0] as ActiveWorkoutSessionRow;
          if (typeof window !== "undefined") {
            window.localStorage.setItem("activeWorkoutId", session.id);
            window.dispatchEvent(new Event("active-workout-change"));
          }
          await restoreSession(session);
          return;
        }
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          performed_at: now,
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

      // Set started_at in DB (separate update to ensure compatibility)
      await supabase
        .from("workout_sessions")
        .update({ started_at: now })
        .eq("id", data.id);

      // Set startedAt for timer display
      if (!cancelled) setStartedAt(now);

      window.localStorage.setItem("activeWorkoutId", data.id);
      window.dispatchEvent(new Event("active-workout-change"));

      // Sync with Telegram CloudStorage
      await markStarted(data.id);

      // If template ID is provided, load exercises from template
      if (templateId) {
        const { data: templateData } = await supabase
          .from("workout_templates")
          .select(
            `
            name,
            workout_template_exercises (
              id,
              order_index,
              sets_count,
              alternative_exercise_ids,
              exercises (
                *,
                muscle_groups (*)
              )
            )
          `
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
            (templateData.workout_template_exercises ||
              []) as unknown as Array<{
              order_index: number;
              sets_count?: number;
              exercises: ExerciseWithMuscleGroup;
              alternative_exercise_ids?: string[] | null;
            }>
          )
            .slice()
            .sort((a, b) => a.order_index - b.order_index);

          const templateAlternativeIds = sortedTemplateExercises.flatMap(
            (templateExercise: {
              alternative_exercise_ids?: string[] | null;
            }) => templateExercise.alternative_exercise_ids || []
          );

          const templateAlternativeMap = new Map<
            string,
            ExerciseWithMuscleGroup
          >();
          if (templateAlternativeIds.length > 0) {
            const { data: alternativeExercises } = await supabase
              .from("exercises")
              .select(
                `
                *,
                muscle_groups (*)
              `
              )
              .in("id", templateAlternativeIds);

            (alternativeExercises || []).forEach((exercise) => {
              templateAlternativeMap.set(
                exercise.id,
                exercise as ExerciseWithMuscleGroup
              );
            });
          }

          // Add each exercise from template to the workout
          const addedExercises: WorkoutExerciseLocal[] = [];

          for (let i = 0; i < sortedTemplateExercises.length; i++) {
            const templateExercise = sortedTemplateExercises[i] as {
              exercises: ExerciseWithMuscleGroup;
              sets_count?: number;
              alternative_exercise_ids?: string[] | null;
            };
            const exercise =
              templateExercise.exercises as ExerciseWithMuscleGroup;
            const setsCount = templateExercise.sets_count ?? 3;

            if (!exercise) continue;

            const allowedAlternativeIds =
              templateExercise.alternative_exercise_ids || [];
            const alternativeOptions = allowedAlternativeIds
              .map((id) => templateAlternativeMap.get(id))
              .filter((item): item is ExerciseWithMuscleGroup => Boolean(item));
            const note = buildAlternativeNote(
              null,
              null,
              allowedAlternativeIds
            );

            const { data: weData, error: weError } = await supabase
              .from("workout_exercises")
              .insert({
                workout_id: data.id,
                exercise_id: exercise.id,
                order_index: i,
                perceived_difficulty: null,
                note,
              })
              .select()
              .single();

            if (weError || !weData) {
              console.error("Error adding exercise from template:", weError);
              continue;
            }

            // Fetch recommended weight from history for this exercise
            let recommendedWeight: number | null = null;
            const { data: historyData } = await supabase
              .from("workout_exercises")
              .select(
                `
                perceived_difficulty,
                workout_sessions!inner (user_id, performed_at, is_completed),
                workout_sets (weight, reps, is_warmup)
              `
              )
              .eq("exercise_id", exercise.id)
              .eq("workout_sessions.user_id", user.id)
              .eq("workout_sessions.is_completed", true)
              .order("workout_sessions(performed_at)", { ascending: false })
              .limit(1);

            if (historyData && historyData.length > 0) {
              const lastWorkout = historyData[0];
              const workingSets = (lastWorkout.workout_sets || [])
                .filter((s: { is_warmup: boolean }) => !s.is_warmup)
                .filter((s: { weight: number | null }) => s.weight !== null);

              if (workingSets.length > 0) {
                const prevWeight = workingSets[workingSets.length - 1].weight;
                const step = 2.5;

                // Adjust based on perceived difficulty
                switch (lastWorkout.perceived_difficulty) {
                  case "easy":
                    recommendedWeight = prevWeight + step;
                    break;
                  case "hard":
                  case "ok":
                  default:
                    recommendedWeight = prevWeight;
                }
              }
            }

            // Create empty sets based on template sets_count
            const emptySets = Array.from(
              { length: setsCount },
              (_, setIndex) => ({
                id: `temp-${Date.now()}-${i}-${setIndex}`,
                weight: recommendedWeight,
                reps: null,
                isWarmup: false,
                isSaved: false,
              })
            );

            addedExercises.push({
              id: weData.id,
              exercise,
              perceivedDifficulty: null,
              sets: emptySets,
              recommendedWeight,
              alternativeExercise: null,
              alternativeWeight: null,
              alternativeOptions,
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
  }, [supabase, router, templateId, resumeId, markStarted]);

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
    [supabase]
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
        alternativeOptions: null,
        isSaved: true,
      };

      setExercises((prev) => [...prev, newExercise]);
      setShowExercisePicker(false);
    },
    [sessionId, exercises.length, supabase, getRecommendedWeight]
  );

  const handleUpdateSets = useCallback(
    (exerciseId: string, sets: WorkoutExerciseLocal["sets"]) => {
      setExercises((prev) =>
        prev.map((ex) => (ex.id === exerciseId ? { ...ex, sets } : ex))
      );
    },
    []
  );

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

  const saveAlternativeNote = useCallback(
    async (
      exerciseId: string,
      alternativeExerciseId: string | null,
      alternativeWeight: number | null,
      allowedAlternativeIds?: string[] | null
    ) => {
      const note = buildAlternativeNote(
        alternativeExerciseId,
        alternativeWeight,
        allowedAlternativeIds
      );

      const { error } = await supabase
        .from("workout_exercises")
        .update({ note })
        .eq("id", exerciseId);

      if (error) {
        console.error("Error saving alternative exercise:", error);
      }
    },
    [supabase]
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
                alternativeOptions: null,
              }
            : ex
        )
      );
    },
    [supabase, getRecommendedWeight]
  );

  const getAllowedAlternativeIds = useCallback(
    (exerciseId: string): string[] | undefined => {
      const exercise = exercises.find((ex) => ex.id === exerciseId);
      if (!exercise || exercise.alternativeOptions === null) return undefined;
      return exercise.alternativeOptions.map((option) => option.id);
    },
    [exercises]
  );

  const handleSetAlternative = useCallback(
    async (exerciseId: string, newExercise: ExerciseWithMuscleGroup) => {
      const recommendedWeight = await getRecommendedWeight(newExercise.id);
      const allowedAlternativeIds = getAllowedAlternativeIds(exerciseId);

      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                alternativeExercise: newExercise,
                alternativeWeight: recommendedWeight,
              }
            : ex
        )
      );

      await saveAlternativeNote(
        exerciseId,
        newExercise.id,
        recommendedWeight,
        allowedAlternativeIds
      );
    },
    [getAllowedAlternativeIds, getRecommendedWeight, saveAlternativeNote]
  );

  const handleClearAlternative = useCallback(
    async (exerciseId: string) => {
      const allowedAlternativeIds = getAllowedAlternativeIds(exerciseId);
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exerciseId
            ? { ...ex, alternativeExercise: null, alternativeWeight: null }
            : ex
        )
      );

      await saveAlternativeNote(exerciseId, null, null, allowedAlternativeIds);
    },
    [getAllowedAlternativeIds, saveAlternativeNote]
  );

  const handleUpdateAlternativeWeight = useCallback(
    (exerciseId: string, weight: number | null) => {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exerciseId ? { ...ex, alternativeWeight: weight } : ex
        )
      );
    },
    []
  );

  const handleSaveAlternativeWeight = useCallback(
    async (exerciseId: string, weight: number | null) => {
      const exercise = exercises.find((ex) => ex.id === exerciseId);
      const alternativeExerciseId = exercise?.alternativeExercise?.id ?? null;
      if (!alternativeExerciseId) return;

      await saveAlternativeNote(
        exerciseId,
        alternativeExerciseId,
        weight,
        exercise?.alternativeOptions === null
          ? undefined
          : (exercise?.alternativeOptions?.map((option) => option.id) ?? [])
      );
    },
    [exercises, saveAlternativeNote]
  );

  const handleDeleteExercise = useCallback(
    async (exerciseId: string) => {
      await supabase.from("workout_exercises").delete().eq("id", exerciseId);
      setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
    },
    [supabase]
  );

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
            set.id
          );
        }
      }
    }

    // Finish workout via RPC (duration calculated on DB side)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (supabase.rpc as any)("finish_workout", {
      p_session_id: sessionId,
      p_name: workoutName || null,
    });

    if (rpcError) {
      console.error("Error finishing workout:", rpcError);
    }

    window.localStorage.removeItem("activeWorkoutId");
    window.dispatchEvent(new Event("active-workout-change"));

    // Clear Telegram CloudStorage and hide button
    await markFinished();

    router.push("/app/workouts");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/80 px-4 pt-12 pb-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/app/workouts"
              className="-ml-2 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <svg
                className="h-6 w-6"
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
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-white">Новая тренировка</h1>
              {startedAt && (
                <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-mono tabular-nums">
                    {formattedTime}
                  </span>
                </div>
              )}
            </div>
          </div>

          {exercises.length > 0 && (
            <button
              onClick={handleFinishWorkout}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 font-semibold text-white transition-all hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg
                  className="h-4 w-4"
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

      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-6">
        {/* Workout Name */}
        <div className="space-y-2">
          <label className="ml-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            Название
          </label>
          <input
            type="text"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="Название тренировки (опционально)"
            className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white placeholder-zinc-600 transition-all outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500"
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
                  tempId
                )
              }
            />
          ))}
        </div>

        {/* Add Exercise Button */}
        <button
          onClick={() => setShowExercisePicker(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-800 py-4 font-semibold text-zinc-500 transition-all duration-200 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-400"
        >
          <svg
            className="h-5 w-5"
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
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      }
    >
      <NewWorkoutContent />
    </Suspense>
  );
}
