"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Clock, Trash2, Save, Loader2 } from "lucide-react";

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

function getDifficultyLabel(difficulty: string | null): {
  text: string;
  class: string;
} {
  switch (difficulty) {
    case "easy":
      return { text: "Легко", class: "badge-success" };
    case "ok":
      return { text: "Нормально", class: "badge-warning" };
    case "hard":
      return { text: "Тяжело", class: "badge-danger" };
    default:
      return { text: "—", class: "" };
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

    // Создаём шаблон
    const { data: template, error: templateError } = await supabase
      .from("workout_templates")
      .insert({
        user_id: user.id,
        name: templateName.trim(),
      })
      .select()
      .single();

    if (templateError) {
      console.error("Error creating template:", templateError);
      setSavingTemplate(false);
      return;
    }

    // Добавляем упражнения в шаблон
    const templateExercises = workout.workout_exercises
      .map((we, index) => ({
        template_id: template.id,
        exercise_id: we.exercises
          ? (we as unknown as { exercise_id: string }).exercise_id
          : null,
        order_index: index,
      }))
      .filter((te) => te.exercise_id);

    // Получаем exercise_id из workout_exercises
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
      <div className="flex-center" style={{ height: "60vh" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!workout) {
    return null;
  }

  const totalSets = workout.workout_exercises.reduce(
    (acc, we) => acc + (we.workout_sets?.length || 0),
    0
  );

  return (
    <>
      <PageHeader
        title={workout.name || "Тренировка"}
        showBack
        action={
          <div className="flex gap-sm">
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setShowTemplateModal(true)}
              title="Сохранить как шаблон"
            >
              <Save size={20} />
            </button>
            <button
              className="btn btn-ghost btn-icon text-danger"
              onClick={handleDelete}
              disabled={deleting}
              title="Удалить"
            >
              {deleting ? (
                <Loader2
                  size={20}
                  style={{ animation: "spin 0.8s linear infinite" }}
                />
              ) : (
                <Trash2 size={20} />
              )}
            </button>
          </div>
        }
      />

      {/* Мета-информация */}
      <div className="card mb-lg">
        <div className="flex items-center gap-md text-small">
          <div className="flex items-center gap-xs text-muted">
            <Calendar size={16} />
            <span>{formatDate(workout.performed_at)}</span>
          </div>
          <div className="flex items-center gap-xs text-muted">
            <Clock size={16} />
            <span>{formatTime(workout.performed_at)}</span>
          </div>
        </div>
        <div className="text-caption mt-sm">
          {workout.workout_exercises.length} упражнений · {totalSets} подходов
        </div>
      </div>

      {/* Упражнения */}
      <div className="flex flex-col gap-md">
        {workout.workout_exercises.map((we) => {
          const difficulty = getDifficultyLabel(we.perceived_difficulty);
          const workingSets =
            we.workout_sets?.filter((s) => !s.is_warmup) || [];
          const warmupSets = we.workout_sets?.filter((s) => s.is_warmup) || [];

          return (
            <div key={we.id} className="exercise-block">
              <div className="exercise-header">
                <div className="exercise-info">
                  <span className="exercise-name">{we.exercises?.name}</span>
                  <span className="exercise-muscle">
                    {we.exercises?.muscle_groups?.name}
                  </span>
                </div>
                {we.perceived_difficulty && (
                  <span className={`badge ${difficulty.class}`}>
                    {difficulty.text}
                  </span>
                )}
              </div>

              {warmupSets.length > 0 && (
                <div className="mb-sm">
                  <span className="text-caption">Разминка:</span>
                  <div className="flex flex-wrap gap-xs mt-xs">
                    {warmupSets.map((set, i) => (
                      <span key={i} className="badge">
                        {set.weight}кг × {set.reps}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {workingSets.length > 0 && (
                <div>
                  <span className="text-caption">Рабочие подходы:</span>
                  <div className="flex flex-wrap gap-xs mt-xs">
                    {workingSets.map((set, i) => (
                      <span key={i} className="badge badge-muscle">
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

      {/* Модалка сохранения шаблона */}
      {showTemplateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowTemplateModal(false)}
        >
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 className="modal-title mb-lg">Сохранить как шаблон</h2>

            <div className="input-group mb-lg">
              <label className="input-label">Название шаблона</label>
              <input
                type="text"
                className="input"
                placeholder="Например: Грудь + Трицепс"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex gap-sm">
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowTemplateModal(false)}
              >
                Отмена
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={!templateName.trim() || savingTemplate}
                onClick={handleSaveAsTemplate}
              >
                {savingTemplate ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
