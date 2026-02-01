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
    new Set(),
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
          `,
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
          }),
        );

        const stats = buildExerciseStats(rows);
        const sorted = stats.sort(
          (a, b) =>
            new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime(),
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
    [supabase, userId],
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
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 pt-12 pb-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-white">Прогресс</h1>
        </div>
      </header>

      <main className="px-4 pt-6 max-w-2xl mx-auto space-y-6">
        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-medium text-sm">
                Произошла ошибка
              </p>
              <p className="text-red-300/70 text-sm mt-1">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400/60 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Flame className="w-6 h-6 text-orange-400" />
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">Рабочие веса</h2>
              {isPending && (
                <span className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              )}
            </div>
            <button
              onClick={() => setShowExerciseModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm text-zinc-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить</span>
            </button>
          </div>

          {/* Category Tabs */}
          {trackedExercises.length > 0 && (
            <div
              className="flex gap-2 mb-4 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              {categories.map((cat) => {
                const count =
                  cat.key === "all"
                    ? trackedExercises.length
                    : trackedExercises.filter((e) =>
                        cat.groups?.includes(e.muscleGroupName),
                      ).length;

                if (cat.key !== "all" && count === 0) return null;

                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
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
              className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 border-dashed text-center cursor-pointer hover:border-zinc-700 transition-colors"
              onClick={() => setShowExerciseModal(true)}
            >
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                <Dumbbell className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-zinc-500 text-sm mb-1">
                Выбери упражнения для отслеживания
              </p>
              <p className="text-zinc-600 text-xs">
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
