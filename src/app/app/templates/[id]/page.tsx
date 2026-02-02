"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ExercisePickerModal } from "@/components/workouts/ExercisePickerModal";
import { ExerciseSwapModal } from "@/components/workouts/ExerciseSwapModal";
import type { ExerciseWithMuscleGroup } from "@/types";

interface TemplateExerciseRow {
  id: string;
  order_index: number;
  alternative_exercise_ids: string[] | null;
  exercises: ExerciseWithMuscleGroup;
}

interface TemplateExerciseLocal {
  id: string;
  orderIndex: number;
  exercise: ExerciseWithMuscleGroup;
  alternatives: ExerciseWithMuscleGroup[];
}

export default function TemplateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  const supabase = useMemo(() => createClient(), []);

  const [templateName, setTemplateName] = useState("");
  const [exercises, setExercises] = useState<TemplateExerciseLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [alternativeTarget, setAlternativeTarget] =
    useState<TemplateExerciseLocal | null>(null);
  const [replaceTarget, setReplaceTarget] =
    useState<TemplateExerciseLocal | null>(null);
  const [savingExerciseId, setSavingExerciseId] = useState<string | null>(null);
  const [deletingExerciseId, setDeletingExerciseId] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplate() {
      setLoading(true);

      const { data, error } = await supabase
        .from("workout_templates")
        .select(
          `
          id,
          name,
          workout_template_exercises (
            id,
            order_index,
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

      if (error || !data) {
        console.error("Error loading template:", error);
        if (!cancelled) {
          router.push("/app/templates");
        }
        return;
      }

      const rows = (data.workout_template_exercises || []) as TemplateExerciseRow[];
      const alternativeIds = rows.flatMap(
        (row) => row.alternative_exercise_ids || []
      );

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
          alternativeMap.set(exercise.id, exercise as ExerciseWithMuscleGroup);
        });
      }

      const formatted = rows
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((row) => {
          const alternatives = (row.alternative_exercise_ids || [])
            .map((id) => alternativeMap.get(id))
            .filter(
              (item): item is ExerciseWithMuscleGroup => Boolean(item)
            );

          return {
            id: row.id,
            orderIndex: row.order_index,
            exercise: row.exercises,
            alternatives,
          };
        });

      if (!cancelled) {
        setTemplateName(data.name || "");
        setExercises(formatted);
        setLoading(false);
      }
    }

    loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [router, supabase, templateId]);

  const handleSaveName = async () => {
    if (!templateName.trim()) return;
    setSavingName(true);
    const { error } = await supabase
      .from("workout_templates")
      .update({ name: templateName.trim() })
      .eq("id", templateId);

    if (error) {
      console.error("Error saving template name:", error);
    }

    setSavingName(false);
  };

  const handleAddExercise = async (exercise: ExerciseWithMuscleGroup) => {
    const orderIndex =
      exercises.reduce((max, item) => Math.max(max, item.orderIndex), -1) + 1;
    const { data, error } = await supabase
      .from("workout_template_exercises")
      .insert({
        template_id: templateId,
        exercise_id: exercise.id,
        order_index: orderIndex,
        alternative_exercise_ids: [],
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Error adding template exercise:", error);
      return;
    }

    setExercises((prev) => [
      ...prev,
      {
        id: data.id,
        orderIndex,
        exercise,
        alternatives: [],
      },
    ]);
    setShowPicker(false);
  };

  const handleDeleteExercise = async (templateExerciseId: string) => {
    if (!confirm("Удалить упражнение из шаблона?")) return;
    setDeletingExerciseId(templateExerciseId);

    const { error } = await supabase
      .from("workout_template_exercises")
      .delete()
      .eq("id", templateExerciseId);

    if (error) {
      console.error("Error deleting template exercise:", error);
      setDeletingExerciseId(null);
      return;
    }

    setExercises((prev) => prev.filter((ex) => ex.id !== templateExerciseId));
    setDeletingExerciseId(null);
  };

  const handleMoveExercise = async (
    templateExerciseId: string,
    direction: -1 | 1
  ) => {
    const currentIndex = exercises.findIndex(
      (exercise) => exercise.id === templateExerciseId
    );
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= exercises.length) {
      return;
    }

    const current = exercises[currentIndex];
    const target = exercises[targetIndex];
    const nextExercises = [...exercises];

    nextExercises[currentIndex] = { ...target, orderIndex: current.orderIndex };
    nextExercises[targetIndex] = { ...current, orderIndex: target.orderIndex };

    setExercises(nextExercises);

    const { error: currentError } = await supabase
      .from("workout_template_exercises")
      .update({ order_index: target.orderIndex })
      .eq("id", current.id);

    const { error: targetError } = await supabase
      .from("workout_template_exercises")
      .update({ order_index: current.orderIndex })
      .eq("id", target.id);

    if (currentError || targetError) {
      console.error("Error updating order:", currentError || targetError);
      setExercises(exercises);
    }
  };

  const handleReplaceExercise = async (
    templateExerciseId: string,
    newExercise: ExerciseWithMuscleGroup
  ) => {
    setSavingExerciseId(templateExerciseId);

    const { error } = await supabase
      .from("workout_template_exercises")
      .update({
        exercise_id: newExercise.id,
        alternative_exercise_ids: [],
      })
      .eq("id", templateExerciseId);

    if (error) {
      console.error("Error replacing exercise:", error);
      setSavingExerciseId(null);
      return;
    }

    setExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === templateExerciseId
          ? { ...exercise, exercise: newExercise, alternatives: [] }
          : exercise
      )
    );
    setSavingExerciseId(null);
  };

  const updateAlternativeIds = async (
    templateExerciseId: string,
    alternatives: ExerciseWithMuscleGroup[]
  ) => {
    setSavingExerciseId(templateExerciseId);
    const alternativeIds = alternatives.map((alt) => alt.id);

    const { error } = await supabase
      .from("workout_template_exercises")
      .update({ alternative_exercise_ids: alternativeIds })
      .eq("id", templateExerciseId);

    if (error) {
      console.error("Error saving alternatives:", error);
      setSavingExerciseId(null);
      return;
    }

    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === templateExerciseId ? { ...ex, alternatives } : ex
      )
    );
    setSavingExerciseId(null);
  };

  const handleAddAlternative = async (
    templateExerciseId: string,
    newExercise: ExerciseWithMuscleGroup
  ) => {
    const target = exercises.find((ex) => ex.id === templateExerciseId);
    if (!target) return;

    if (target.alternatives.some((alt) => alt.id === newExercise.id)) return;

    const updated = [...target.alternatives, newExercise];
    await updateAlternativeIds(templateExerciseId, updated);
  };

  const handleRemoveAlternative = async (
    templateExerciseId: string,
    alternativeId: string
  ) => {
    const target = exercises.find((ex) => ex.id === templateExerciseId);
    if (!target) return;

    const updated = target.alternatives.filter((alt) => alt.id !== alternativeId);
    await updateAlternativeIds(templateExerciseId, updated);
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
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/80 px-4 pt-12 pb-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/app/templates"
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
            <h1 className="text-xl font-bold text-white">Шаблон</h1>
          </div>

          <button
            onClick={handleSaveName}
            disabled={savingName || !templateName.trim()}
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-orange-600 disabled:opacity-50"
          >
            {savingName ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-6">
        <div className="space-y-2">
          <label className="ml-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            Название
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Название шаблона"
            className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-white placeholder-zinc-600 transition-all outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="space-y-4">
          {exercises.map((exercise, index) => (
            <div
              key={exercise.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {exercise.exercise.name}
                  </h3>
                  <p className="text-xs text-orange-400">
                    {exercise.exercise.muscle_groups?.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReplaceTarget(exercise)}
                    disabled={savingExerciseId === exercise.id}
                    className="rounded-lg bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
                  >
                    Заменить
                  </button>
                  <button
                    onClick={() => handleMoveExercise(exercise.id, -1)}
                    disabled={index === 0}
                    className="rounded-lg bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-400 transition-colors hover:bg-zinc-700 disabled:opacity-30"
                    title="Выше"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveExercise(exercise.id, 1)}
                    disabled={index === exercises.length - 1}
                    className="rounded-lg bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-400 transition-colors hover:bg-zinc-700 disabled:opacity-30"
                    title="Ниже"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleDeleteExercise(exercise.id)}
                    disabled={deletingExerciseId === exercise.id}
                    className="rounded-xl p-2 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    title="Удалить упражнение"
                  >
                    {deletingExerciseId === exercise.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Альтернативы</span>
                  <button
                    onClick={() => setAlternativeTarget(exercise)}
                    disabled={savingExerciseId === exercise.id}
                    className="text-xs font-semibold text-orange-400 transition-colors hover:text-orange-300 disabled:text-zinc-600"
                  >
                    Добавить
                  </button>
                </div>

                {exercise.alternatives.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {exercise.alternatives.map((alt) => (
                      <div
                        key={alt.id}
                        className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-200"
                      >
                        <span>{alt.name}</span>
                        <button
                          onClick={() =>
                            handleRemoveAlternative(exercise.id, alt.id)
                          }
                          className="text-zinc-400 transition-colors hover:text-red-400"
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500">
                    Альтернативы пока не добавлены.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowPicker(true)}
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

      {showPicker && (
        <ExercisePickerModal
          onSelect={handleAddExercise}
          onClose={() => setShowPicker(false)}
        />
      )}

      {replaceTarget && (
        <ExercisePickerModal
          onSelect={(exercise) => {
            void handleReplaceExercise(replaceTarget.id, exercise);
            setReplaceTarget(null);
          }}
          onClose={() => setReplaceTarget(null)}
        />
      )}

      {alternativeTarget && (
        <ExerciseSwapModal
          isOpen
          currentExercise={alternativeTarget.exercise}
          excludedExerciseIds={[
            alternativeTarget.exercise.id,
            ...alternativeTarget.alternatives.map((alt) => alt.id),
          ]}
          onClose={() => setAlternativeTarget(null)}
          onSelect={(newExercise) => {
            void handleAddAlternative(alternativeTarget.id, newExercise);
            setAlternativeTarget(null);
          }}
        />
      )}
    </div>
  );
}
