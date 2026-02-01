"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseHistory } from "@/lib/analytics/buildExerciseStats";
import {
  buildExerciseStats,
  type WorkoutExerciseRow,
} from "@/lib/analytics/buildExerciseStats";
import ExerciseCard from "./ExerciseCard";
import ExerciseSelectionModal, {
  type ExerciseOption,
} from "./ExerciseSelectionModal";
import WeightModal from "./WeightModal";
import WeightCard from "./WeightCard";
import { Flame, Plus, Dumbbell, AlertTriangle, X } from "lucide-react";

// Категории для фильтрации
const CATEGORY_GROUPS: Record<string, string[]> = {
  all: [],
  upper: ["Грудь", "Спина", "Плечи", "Трапеции"],
  arms: ["Бицепс", "Трицепс", "Предплечья"],
  legs: ["Квадрицепсы", "Бицепс бедра", "Ягодицы", "Икры"],
  core: ["Пресс"],
};

interface AnalyticsClientProps {
  initialStats: ExerciseHistory[];
  initialExercises: ExerciseOption[];
  initialSelectedIds: string[];
  totalWorkouts: number;
  userId: string;
}

export default function AnalyticsClient({
  initialStats,
  initialExercises,
  initialSelectedIds,
  totalWorkouts,
  userId,
}: AnalyticsClientProps) {
  // Guard для защиты от setState после размонтирования
  const mountedRef = useRef(true);

  // Transition для защиты от race conditions
  const [isPending, startTransition] = useTransition();

  // Состояния данных
  const [trackedExercises, setTrackedExercises] =
    useState<ExerciseHistory[]>(initialStats);
  const [availableExercises] = useState<ExerciseOption[]>(initialExercises);
  const [selectedExerciseIds, setSelectedExerciseIds] =
    useState<string[]>(initialSelectedIds);

  // Состояния UI
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    new Set()
  );
  const [activeCategory, setActiveCategory] = useState("all");
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Состояния веса тела (из localStorage)
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [weightHistory, setWeightHistory] = useState<
    { weight: number; date: string }[]
  >([]);

  const supabase = createClient();

  // Загрузка истории упражнений (объявляем до useEffect)
  const loadExerciseHistory = useCallback(
    async (exerciseIds: string[]) => {
      if (exerciseIds.length === 0) {
        if (mountedRef.current) setTrackedExercises([]);
        return;
      }

      try {
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
          .eq("workout_sessions.user_id", userId);

        if (error) throw error;

        // Guard: проверяем что компонент ещё смонтирован
        if (!mountedRef.current) return;

        const rows: WorkoutExerciseRow[] = (workoutExercises ?? []).map(
          (we) => ({
            exercise_id: we.exercise_id,
            exercises: we.exercises as WorkoutExerciseRow["exercises"],
            workout_sessions:
              we.workout_sessions as WorkoutExerciseRow["workout_sessions"],
            workout_sets: we.workout_sets as WorkoutExerciseRow["workout_sets"],
          })
        );

        const stats = buildExerciseStats(rows);
        const sorted = stats.sort(
          (a, b) =>
            new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime()
        );

        if (mountedRef.current) {
          setTrackedExercises(sorted);
        }
      } catch (err) {
        console.error("Ошибка загрузки:", err);
        if (mountedRef.current) {
          setErrorMessage("Не удалось загрузить историю упражнений");
        }
      }
    },
    [supabase, userId]
  );

  // Загрузка данных из localStorage и начальная загрузка упражнений
  useEffect(() => {
    mountedRef.current = true;

    const savedWeight = localStorage.getItem("userWeight");
    const savedGoal = localStorage.getItem("userGoalWeight");
    const savedHistory = localStorage.getItem("weightHistory");
    const savedExerciseIds = localStorage.getItem("trackedExerciseIds");

    if (savedWeight) setCurrentWeight(parseFloat(savedWeight));
    if (savedGoal) setGoalWeight(parseFloat(savedGoal));
    if (savedHistory) setWeightHistory(JSON.parse(savedHistory));

    // Загружаем отслеживаемые упражнения
    if (savedExerciseIds) {
      const ids = JSON.parse(savedExerciseIds) as string[];
      setSelectedExerciseIds(ids);
      loadExerciseHistory(ids);
    }

    // Cleanup: сбрасываем флаг при размонтировании
    return () => {
      mountedRef.current = false;
    };
  }, [loadExerciseHistory]);

  // Переключение упражнения (с startTransition для UX)
  function toggleExercise(exerciseId: string) {
    const newIds = selectedExerciseIds.includes(exerciseId)
      ? selectedExerciseIds.filter((id) => id !== exerciseId)
      : [...selectedExerciseIds, exerciseId];

    setSelectedExerciseIds(newIds);
    localStorage.setItem("trackedExerciseIds", JSON.stringify(newIds));

    // Используем startTransition для неблокирующего обновления
    startTransition(() => {
      loadExerciseHistory(newIds);
    });
  }

  // Сохранение веса тела
  function saveWeight(weight: number, goal: number) {
    setCurrentWeight(weight);
    setGoalWeight(goal);
    localStorage.setItem("userWeight", weight.toString());
    localStorage.setItem("userGoalWeight", goal.toString());

    const newEntry = { weight, date: new Date().toISOString() };
    const newHistory = [...weightHistory, newEntry].slice(-30);
    setWeightHistory(newHistory);
    localStorage.setItem("weightHistory", JSON.stringify(newHistory));
    setShowWeightModal(false);
  }

  // Фильтрация по категории
  const filteredExercises = trackedExercises.filter((exercise) => {
    if (activeCategory === "all") return true;
    return CATEGORY_GROUPS[activeCategory]?.includes(exercise.muscleGroupName);
  });

  // Категории с подсчётом
  const categories = [
    { key: "all", label: "Все" },
    { key: "upper", label: "Верх", groups: CATEGORY_GROUPS.upper },
    { key: "arms", label: "Руки", groups: CATEGORY_GROUPS.arms },
    { key: "legs", label: "Ноги", groups: CATEGORY_GROUPS.legs },
    { key: "core", label: "Кор", groups: CATEGORY_GROUPS.core },
  ];

  return (
    <div className="min-h-screen bg-black pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/80 px-4 pt-12 pb-4 backdrop-blur-md">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold text-white">Прогресс</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-6">
        {/* Error Banner */}
        {errorMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">
                Произошла ошибка
              </p>
              <p className="mt-1 text-sm text-red-300/70">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400/60 transition-colors hover:text-red-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/20">
            <Flame className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{totalWorkouts}</p>
            <p className="text-sm text-zinc-500">тренировок всего</p>
          </div>
        </div>

        {/* Weight Card */}
        <WeightCard
          currentWeight={currentWeight}
          goalWeight={goalWeight}
          weightHistory={weightHistory}
          onClick={() => setShowWeightModal(true)}
        />

        {/* My Exercises Section */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">Рабочие веса</h2>
              {isPending && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
              )}
            </div>
            <button
              onClick={() => setShowExerciseModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              <Plus className="h-4 w-4" />
              <span>Добавить</span>
            </button>
          </div>

          {/* Category Tabs */}
          {trackedExercises.length > 0 && (
            <div
              className="mb-4 flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              {categories.map((cat) => {
                const count =
                  cat.key === "all"
                    ? trackedExercises.length
                    : trackedExercises.filter((e) =>
                        cat.groups?.includes(e.muscleGroupName)
                      ).length;

                if (cat.key !== "all" && count === 0) return null;

                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all ${
                      activeCategory === cat.key
                        ? "bg-orange-500 text-white"
                        : "bg-zinc-800/80 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {cat.label}
                    <span
                      className={`text-xs ${activeCategory === cat.key ? "text-orange-200" : "text-zinc-500"}`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Exercise Cards or Empty State */}
          {trackedExercises.length === 0 ? (
            <div
              className="cursor-pointer rounded-2xl border border-dashed border-zinc-800 bg-zinc-900 p-6 text-center transition-colors hover:border-zinc-700"
              onClick={() => setShowExerciseModal(true)}
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                <Dumbbell className="h-6 w-6 text-zinc-600" />
              </div>
              <p className="mb-1 text-sm text-zinc-500">
                Выбери упражнения для отслеживания
              </p>
              <p className="text-xs text-zinc-600">
                Показатели будут подсказывать во время тренировки
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.exerciseId}
                  data={exercise}
                  isExpanded={expandedExercises.has(exercise.exerciseId)}
                  onToggleExpand={() => {
                    setExpandedExercises((prev) => {
                      const next = new Set(prev);
                      if (next.has(exercise.exerciseId)) {
                        next.delete(exercise.exerciseId);
                      } else {
                        next.add(exercise.exerciseId);
                      }
                      return next;
                    });
                  }}
                  onRemove={() => toggleExercise(exercise.exerciseId)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modals */}
      {showWeightModal && (
        <WeightModal
          currentWeight={currentWeight}
          goalWeight={goalWeight}
          onSave={saveWeight}
          onClose={() => setShowWeightModal(false)}
          isPending={isPending}
        />
      )}

      {showExerciseModal && (
        <ExerciseSelectionModal
          exercises={availableExercises}
          selectedIds={selectedExerciseIds}
          onToggle={toggleExercise}
          onClose={() => setShowExerciseModal(false)}
        />
      )}
    </div>
  );
}
