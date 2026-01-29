"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface WorkoutSet {
  id: string;
  weight: number;
  reps: number;
  is_warmup: boolean;
}

interface WorkoutExercise {
  id: string;
  perceived_difficulty: "easy" | "ok" | "hard" | null;
  exercises: {
    name: string;
    muscle_groups: {
      name: string;
    };
  };
  workout_sets: WorkoutSet[];
}

interface WorkoutDetails {
  id: string;
  performed_at: string;
  name: string | null;
  note: string | null;
  workout_exercises: WorkoutExercise[];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDifficultyStyle(difficulty: string | null): {
  text: string;
  class: string;
} {
  switch (difficulty) {
    case "easy":
      return { text: "Легко", class: "bg-green-500/20 text-green-400" };
    case "ok":
      return { text: "Нормально", class: "bg-yellow-500/20 text-yellow-400" };
    case "hard":
      return { text: "Тяжело", class: "bg-red-500/20 text-red-400" };
    default:
      return { text: "—", class: "bg-zinc-800 text-zinc-400" };
  }
}

export default function WorkoutDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const supabase = createClient();
  const workoutId = params.id as string;

  useEffect(() => {
    async function loadWorkout() {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(
          `
          id,
          performed_at,
          name,
          note,
          workout_exercises (
            id,
            perceived_difficulty,
            exercises (
              name,
              muscle_groups (
                name
              )
            ),
            workout_sets (
              id,
              weight,
              reps,
              is_warmup
            )
          )
        `
        )
        .eq("id", workoutId)
        .single();

      if (error) {
        console.error("Error loading workout:", error);
        router.push("/app/workouts");
        return;
      }

      setWorkout(data as unknown as WorkoutDetails);
      setLoading(false);
    }

    loadWorkout();
  }, [supabase, workoutId, router]);

  const handleDelete = async () => {
    if (!confirm("Удалить эту тренировку?")) return;
    setDeleting(true);
    await supabase.from("workout_sessions").delete().eq("id", workoutId);
    router.push("/app/workouts");
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim() || !workout) return;

    setSavingTemplate(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: template, error: templateError } = await supabase
      .from("workout_templates")
      .insert({ user_id: user.id, name: templateName.trim() })
      .select()
      .single();

    if (templateError) {
      console.error("Error creating template:", templateError);
      setSavingTemplate(false);
      return;
    }

    const { data: weData } = await supabase
      .from("workout_exercises")
      .select("id, exercise_id")
      .eq("workout_id", workoutId);

    if (weData) {
      const exercises = weData.map((we, index) => ({
        template_id: template.id,
        exercise_id: we.exercise_id,
        order_index: index,
      }));

      await supabase.from("workout_template_exercises").insert(exercises);
    }

    setSavingTemplate(false);
    setShowTemplateModal(false);
    setTemplateName("");
    alert("Шаблон сохранён!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!workout) return null;

  const totalSets = workout.workout_exercises.reduce(
    (acc, we) => acc + (we.workout_sets?.length || 0),
    0
  );

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
            <h1 className="text-xl font-bold text-white">
              {workout.name || "Тренировка"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
              title="Сохранить как шаблон"
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
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-50"
              title="Удалить"
            >
              {deleting ? (
                <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              ) : (
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 pt-6 max-w-2xl mx-auto space-y-6">
        {/* Meta Info Card */}
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <div className="flex items-center gap-4 text-sm text-zinc-400 mb-2">
            <div className="flex items-center gap-2">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>{formatDate(workout.performed_at)}</span>
            </div>
            <div className="flex items-center gap-2">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{formatTime(workout.performed_at)}</span>
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            {workout.workout_exercises.length} упражнений · {totalSets} подходов
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-4">
          {workout.workout_exercises.map((we) => {
            const difficulty = getDifficultyStyle(we.perceived_difficulty);
            const workingSets =
              we.workout_sets?.filter((s) => !s.is_warmup) || [];
            const warmupSets =
              we.workout_sets?.filter((s) => s.is_warmup) || [];

            return (
              <div
                key={we.id}
                className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white">
                      {we.exercises?.name}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {we.exercises?.muscle_groups?.name}
                    </p>
                  </div>
                  {we.perceived_difficulty && (
                    <span
                      className={`text-xs px-2 py-1 rounded-md font-medium ${difficulty.class}`}
                    >
                      {difficulty.text}
                    </span>
                  )}
                </div>

                {warmupSets.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs text-zinc-500 mb-1 block">
                      Разминка:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {warmupSets.map((set, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-zinc-400"
                        >
                          {set.weight}кг × {set.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {workingSets.length > 0 && (
                  <div>
                    <span className="text-xs text-zinc-500 mb-1 block">
                      Рабочие подходы:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {workingSets.map((set, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded-md bg-orange-500/20 text-orange-400 font-medium"
                        >
                          {set.weight}кг × {set.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Save as Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTemplateModal(false)}
          />
          <div className="relative w-full max-w-md bg-zinc-900 sm:rounded-2xl rounded-t-2xl shadow-2xl p-6 ring-1 ring-white/10">
            <h2 className="text-lg font-bold text-white mb-6">
              Сохранить как шаблон
            </h2>

            <div className="space-y-2 mb-6">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">
                Название шаблона
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Например: Грудь + Трицепс"
                autoFocus
                className="w-full h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="flex-1 py-3 bg-zinc-800 text-white font-semibold rounded-xl hover:bg-zinc-700 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveAsTemplate}
                disabled={!templateName.trim() || savingTemplate}
                className="flex-[2] py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50"
              >
                {savingTemplate ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
