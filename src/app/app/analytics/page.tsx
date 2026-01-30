"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Trophy,
  Flame,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus,
  X,
  Search,
  Check,
  Dumbbell,
} from "lucide-react";

interface WeightHistoryEntry {
  date: string;
  weight: number;
}

interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  muscleGroupName: string;
  lastWeight: number;
  maxWeight: number;
  lastDate: string;
  history: WeightHistoryEntry[];
}

interface ExerciseOption {
  id: string;
  name: string;
  muscleGroupName: string;
}

interface WeightEntry {
  weight: number;
  date: string;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [trackedExercises, setTrackedExercises] = useState<ExerciseHistory[]>(
    [],
  );
  const [availableExercises, setAvailableExercises] = useState<
    ExerciseOption[]
  >([]);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    new Set(),
  );
  const [activeExerciseCategory, setActiveExerciseCategory] =
    useState<string>("all");

  const supabase = createClient();

  const loadExerciseHistory = useCallback(
    async (userId: string, exerciseIds: string[]) => {
      if (exerciseIds.length === 0) {
        setTrackedExercises([]);
        return;
      }

      const { data: workoutExercises } = await supabase
        .from("workout_exercises")
        .select(
          `
        id,
        exercise_id,
        exercises (
          id,
          name,
          muscle_groups (
            name
          )
        ),
        workout_sessions!inner (
          user_id,
          performed_at
        ),
        workout_sets (
          weight
        )
      `,
        )
        .in("exercise_id", exerciseIds)
        .eq("workout_sessions.user_id", userId)
        .order("workout_sessions(performed_at)", { ascending: false });

      if (!workoutExercises) {
        setTrackedExercises([]);
        return;
      }

      const exerciseMap = new Map<string, ExerciseHistory>();

      interface WorkoutExerciseData {
        exercise_id: string;
        exercises: {
          id: string;
          name: string;
          muscle_groups: { name: string } | null;
        } | null;
        workout_sessions: { performed_at: string };
        workout_sets: { weight: number }[] | null;
      }

      workoutExercises.forEach((we: WorkoutExerciseData) => {
        const exerciseId = we.exercise_id;
        const exerciseName = we.exercises?.name || "Упражнение";
        const muscleGroupName = we.exercises?.muscle_groups?.name || "";
        const date = we.workout_sessions.performed_at;

        if (!exerciseMap.has(exerciseId)) {
          exerciseMap.set(exerciseId, {
            exerciseId,
            exerciseName,
            muscleGroupName,
            lastWeight: 0,
            maxWeight: 0,
            lastDate: date,
            history: [],
          });
        }

        const history = exerciseMap.get(exerciseId)!;

        // Находим максимальный вес в этой тренировке
        let maxWeightInSession = 0;
        we.workout_sets?.forEach((set) => {
          if (set.weight > maxWeightInSession) {
            maxWeightInSession = set.weight;
          }
          if (set.weight > history.maxWeight) {
            history.maxWeight = set.weight;
          }
          if (history.lastWeight === 0) {
            history.lastWeight = set.weight;
          }
        });

        // Добавляем в историю (если не дубликат по дате)
        const dateStr = new Date(date).toISOString().split("T")[0];
        const existingEntry = history.history.find(
          (h) => new Date(h.date).toISOString().split("T")[0] === dateStr,
        );

        if (!existingEntry && maxWeightInSession > 0) {
          history.history.push({
            date,
            weight: maxWeightInSession,
          });
        }
      });

      // Сортируем историю внутри каждого упражнения
      exerciseMap.forEach((exercise) => {
        exercise.history.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        // Оставляем последние 10 записей
        exercise.history = exercise.history.slice(0, 10);
      });

      const sorted = Array.from(exerciseMap.values()).sort(
        (a, b) =>
          new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime(),
      );

      setTrackedExercises(sorted);
    },
    [supabase],
  );

  const loadAvailableExercises = useCallback(
    async (userId: string) => {
      const { data: workoutExercises } = await supabase
        .from("workout_exercises")
        .select(
          `
        exercise_id,
        exercises (
          id,
          name,
          muscle_groups (
            name
          )
        ),
        workout_sessions!inner (
          user_id
        )
      `,
        )
        .eq("workout_sessions.user_id", userId);

      if (!workoutExercises) {
        setAvailableExercises([]);
        return;
      }

      const exerciseMap = new Map<string, ExerciseOption>();

      interface AvailableExerciseData {
        exercise_id: string;
        exercises: {
          id: string;
          name: string;
          muscle_groups: { name: string } | null;
        } | null;
      }

      workoutExercises.forEach((we: AvailableExerciseData) => {
        if (we.exercises && !exerciseMap.has(we.exercise_id)) {
          exerciseMap.set(we.exercise_id, {
            id: we.exercises.id,
            name: we.exercises.name,
            muscleGroupName: we.exercises.muscle_groups?.name || "",
          });
        }
      });

      setAvailableExercises(Array.from(exerciseMap.values()));
    },
    [supabase],
  );

  const loadData = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const savedWeight = localStorage.getItem("userWeight");
    const savedGoal = localStorage.getItem("userGoalWeight");
    const savedHistory = localStorage.getItem("weightHistory");
    const savedExercises = localStorage.getItem("trackedExerciseIds");

    if (savedWeight) setCurrentWeight(parseFloat(savedWeight));
    if (savedGoal) setGoalWeight(parseFloat(savedGoal));
    if (savedHistory) setWeightHistory(JSON.parse(savedHistory));

    await loadAvailableExercises(user.id);

    const exerciseIds = savedExercises ? JSON.parse(savedExercises) : [];
    setSelectedExerciseIds(exerciseIds);
    await loadExerciseHistory(user.id, exerciseIds);

    const { count: workoutsCount } = await supabase
      .from("workout_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    setTotalWorkouts(workoutsCount || 0);
    setLoading(false);
  }, [supabase, loadExerciseHistory, loadAvailableExercises]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function toggleExercise(exerciseId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let newIds: string[];
    if (selectedExerciseIds.includes(exerciseId)) {
      newIds = selectedExerciseIds.filter((id) => id !== exerciseId);
    } else {
      newIds = [...selectedExerciseIds, exerciseId];
    }

    setSelectedExerciseIds(newIds);
    localStorage.setItem("trackedExerciseIds", JSON.stringify(newIds));
    await loadExerciseHistory(user.id, newIds);
  }

  function toggleExpanded(exerciseId: string) {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  }

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

  const weightDiff =
    currentWeight && goalWeight ? currentWeight - goalWeight : null;
  const isGaining =
    goalWeight && currentWeight ? goalWeight > currentWeight : false;
  const progressPercent =
    currentWeight && goalWeight && weightHistory.length > 0
      ? Math.min(
          100,
          Math.abs(
            ((currentWeight - weightHistory[0].weight) /
              (goalWeight - weightHistory[0].weight)) *
              100,
          ),
        )
      : 0;

  return (
    <div className="min-h-screen bg-black pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 pt-12 pb-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-white">Прогресс</h1>
        </div>
      </header>

      <main className="px-4 pt-6 max-w-2xl mx-auto space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-zinc-900 rounded-2xl animate-pulse border border-zinc-800"
              />
            ))}
          </div>
        ) : (
          <>
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
            <div
              className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-2xl p-5 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-all"
              onClick={() => setShowWeightModal(true)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Scale className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Вес тела</h3>
                    <p className="text-xs text-zinc-500">
                      {currentWeight ? "Нажми чтобы обновить" : "Добавить вес"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600" />
              </div>

              {currentWeight ? (
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-white">
                      {currentWeight}
                    </span>
                    <span className="text-lg text-zinc-500 pb-1">кг</span>
                    {weightDiff !== null && (
                      <div
                        className={`flex items-center gap-1 ml-auto px-2 py-1 rounded-lg ${
                          isGaining
                            ? weightDiff < 0
                              ? "bg-green-500/20 text-green-400"
                              : "bg-orange-500/20 text-orange-400"
                            : weightDiff > 0
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {weightDiff > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span className="text-xs font-medium">
                          {Math.abs(weightDiff).toFixed(1)} кг до цели
                        </span>
                      </div>
                    )}
                  </div>

                  {goalWeight && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">
                          Цель: {goalWeight} кг
                        </span>
                        <span className="text-zinc-400">
                          {isNaN(progressPercent)
                            ? 0
                            : progressPercent.toFixed(0)}
                          %
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                          style={{
                            width: `${isNaN(progressPercent) ? 0 : progressPercent}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-zinc-500 text-sm">
                    Добавь свой вес для отслеживания прогресса
                  </p>
                </div>
              )}
            </div>

            {/* My Exercises Section */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white">
                  Рабочие веса
                </h2>
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
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {[
                    { key: "all", label: "Все" },
                    {
                      key: "upper",
                      label: "Верх",
                      groups: ["Грудь", "Спина", "Плечи", "Трапеции"],
                    },
                    {
                      key: "arms",
                      label: "Руки",
                      groups: ["Бицепс", "Трицепс", "Предплечья"],
                    },
                    {
                      key: "legs",
                      label: "Ноги",
                      groups: [
                        "Квадрицепсы",
                        "Бицепс бедра",
                        "Ягодицы",
                        "Икры",
                      ],
                    },
                    { key: "core", label: "Кор", groups: ["Пресс"] },
                  ].map((cat) => {
                    const count =
                      cat.key === "all"
                        ? trackedExercises.length
                        : trackedExercises.filter((e) =>
                            cat.groups?.includes(e.muscleGroupName),
                          ).length;
                    const isActive = activeExerciseCategory === cat.key;

                    if (cat.key !== "all" && count === 0) return null;

                    return (
                      <button
                        key={cat.key}
                        onClick={() => setActiveExerciseCategory(cat.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                          isActive
                            ? "bg-orange-500 text-white"
                            : "bg-zinc-800/80 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {cat.label}
                        <span
                          className={`text-xs ${isActive ? "text-orange-200" : "text-zinc-500"}`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

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
                  {trackedExercises
                    .filter((exercise) => {
                      if (activeExerciseCategory === "all") return true;
                      const categoryGroups: Record<string, string[]> = {
                        upper: ["Грудь", "Спина", "Плечи", "Трапеции"],
                        arms: ["Бицепс", "Трицепс", "Предплечья"],
                        legs: [
                          "Квадрицепсы",
                          "Бицепс бедра",
                          "Ягодицы",
                          "Икры",
                        ],
                        core: ["Пресс"],
                      };
                      return categoryGroups[activeExerciseCategory]?.includes(
                        exercise.muscleGroupName,
                      );
                    })
                    .map((exercise) => {
                      const isExpanded = expandedExercises.has(
                        exercise.exerciseId,
                      );

                      return (
                        <div
                          key={exercise.exerciseId}
                          className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
                        >
                          {/* Main Row */}
                          <div
                            className="p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                            onClick={() => toggleExpanded(exercise.exerciseId)}
                          >
                            {/* Top Line - Name and Weight */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div
                                  className={`transition-transform duration-200 flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                                >
                                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                                </div>
                                <h3 className="font-medium text-white truncate">
                                  {exercise.exerciseName}
                                </h3>
                              </div>

                              <div className="flex items-center gap-3 flex-shrink-0">
                                {/* Рабочий вес */}
                                <p className="text-lg font-bold text-white whitespace-nowrap">
                                  {exercise.lastWeight}
                                  <span className="text-sm text-zinc-500 ml-1">
                                    кг
                                  </span>
                                </p>

                                {/* Рекорд */}
                                {exercise.maxWeight > exercise.lastWeight && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                    <Trophy className="w-3.5 h-3.5 text-orange-400" />
                                    <span className="text-sm font-medium text-orange-400">
                                      {exercise.maxWeight}
                                    </span>
                                  </div>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExercise(exercise.exerciseId);
                                  }}
                                  className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Bottom Line - Date */}
                            <p className="text-xs text-zinc-500 mt-1 ml-7">
                              {new Date(exercise.lastDate).toLocaleDateString(
                                "ru-RU",
                                {
                                  day: "numeric",
                                  month: "short",
                                },
                              )}
                              {exercise.history.length > 1 && (
                                <span className="text-zinc-600">
                                  {" "}
                                  • {exercise.history.length} записей
                                </span>
                              )}
                            </p>
                          </div>

                          {/* History Section */}
                          {isExpanded && exercise.history.length > 0 && (
                            <div className="px-4 pb-4 pt-0">
                              <div className="border-t border-zinc-800 pt-3">
                                <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wide">
                                  История изменений
                                </p>
                                <div className="space-y-2">
                                  {exercise.history.map((entry, index) => {
                                    const prevEntry =
                                      exercise.history[index + 1];
                                    const diff = prevEntry
                                      ? entry.weight - prevEntry.weight
                                      : 0;
                                    const isRecord =
                                      entry.weight === exercise.maxWeight;

                                    return (
                                      <div
                                        key={entry.date}
                                        className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                                          index === 0 ? "bg-zinc-800/50" : ""
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="text-sm text-zinc-400">
                                            {new Date(
                                              entry.date,
                                            ).toLocaleDateString("ru-RU", {
                                              day: "numeric",
                                              month: "short",
                                            })}
                                          </span>
                                          {isRecord && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/20 rounded">
                                              <Trophy className="w-3 h-3 text-orange-400" />
                                              <span className="text-[10px] text-orange-400 font-medium">
                                                PR
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-white">
                                            {entry.weight} кг
                                          </span>
                                          {diff !== 0 && (
                                            <span
                                              className={`text-xs flex items-center gap-0.5 ${
                                                diff > 0
                                                  ? "text-green-400"
                                                  : "text-red-400"
                                              }`}
                                            >
                                              {diff > 0 ? (
                                                <TrendingUp className="w-3 h-3" />
                                              ) : (
                                                <TrendingDown className="w-3 h-3" />
                                              )}
                                              {Math.abs(diff)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Weight Modal */}
      {showWeightModal && (
        <WeightModal
          currentWeight={currentWeight}
          goalWeight={goalWeight}
          onSave={saveWeight}
          onClose={() => setShowWeightModal(false)}
        />
      )}

      {/* Exercise Selection Modal */}
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

// Модальное окно для ввода веса
function WeightModal({
  currentWeight,
  goalWeight,
  onSave,
  onClose,
}: {
  currentWeight: number | null;
  goalWeight: number | null;
  onSave: (weight: number, goal: number) => void;
  onClose: () => void;
}) {
  const [weight, setWeight] = useState(currentWeight || 70);
  const [goal, setGoal] = useState(goalWeight || 75);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm bg-zinc-900 rounded-3xl border border-zinc-700 shadow-2xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-white text-center">
          Обновить вес
        </h2>

        {/* Current Weight */}
        <div className="space-y-2">
          <label className="text-sm text-zinc-400">Текущий вес</label>
          <div className="flex items-center justify-center gap-4 bg-zinc-800 rounded-2xl p-4">
            <button
              onClick={() => setWeight((w) => Math.max(30, w - 0.5))}
              className="w-10 h-10 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors"
            >
              <Minus className="w-5 h-5 text-white" />
            </button>
            <div className="text-center">
              <span className="text-4xl font-bold text-white">{weight}</span>
              <span className="text-lg text-zinc-500 ml-1">кг</span>
            </div>
            <button
              onClick={() => setWeight((w) => Math.min(200, w + 0.5))}
              className="w-10 h-10 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Goal Weight */}
        <div className="space-y-2">
          <label className="text-sm text-zinc-400">Цель по весу</label>
          <div className="flex items-center justify-center gap-4 bg-zinc-800 rounded-2xl p-4">
            <button
              onClick={() => setGoal((g) => Math.max(30, g - 0.5))}
              className="w-10 h-10 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors"
            >
              <Minus className="w-5 h-5 text-white" />
            </button>
            <div className="text-center">
              <span className="text-4xl font-bold text-white">{goal}</span>
              <span className="text-lg text-zinc-500 ml-1">кг</span>
            </div>
            <button
              onClick={() => setGoal((g) => Math.min(200, g + 0.5))}
              className="w-10 h-10 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-medium hover:bg-zinc-700 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={() => onSave(weight, goal)}
            className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

// Модальное окно выбора упражнений
function ExerciseSelectionModal({
  exercises,
  selectedIds,
  onToggle,
  onClose,
}: {
  exercises: ExerciseOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Категории мышечных групп
  const MUSCLE_CATEGORIES: Record<string, string[]> = {
    all: [], // Все
    upper: ["Грудь", "Спина", "Плечи", "Трапеции"], // Верх
    arms: ["Бицепс", "Трицепс", "Предплечья"], // Руки
    legs: ["Квадрицепсы", "Бицепс бедра", "Ягодицы", "Икры"], // Ноги
    core: ["Пресс"], // Кор
  };

  const CATEGORY_LABELS: Record<string, string> = {
    all: "Все",
    upper: "Верх",
    arms: "Руки",
    legs: "Ноги",
    core: "Кор",
  };

  // Фильтрация по поиску и категории
  const filtered = exercises.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.muscleGroupName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      activeCategory === "all" ||
      MUSCLE_CATEGORIES[activeCategory]?.includes(e.muscleGroupName);

    return matchesSearch && matchesCategory;
  });

  const grouped = filtered.reduce(
    (acc, exercise) => {
      const group = exercise.muscleGroupName || "Другое";
      if (!acc[group]) acc[group] = [];
      acc[group].push(exercise);
      return acc;
    },
    {} as Record<string, ExerciseOption[]>,
  );

  // Подсчёт упражнений в каждой категории
  const getCategoryCount = (category: string) => {
    if (category === "all") return exercises.length;
    return exercises.filter((e) =>
      MUSCLE_CATEGORIES[category]?.includes(e.muscleGroupName),
    ).length;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg h-[85vh] bg-zinc-900 rounded-t-3xl border-t border-zinc-800 shadow-2xl flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-xl font-bold text-white">Выбрать упражнения</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-5 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const count = getCategoryCount(key);
              const isActive = activeCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-orange-500 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span
                      className={`text-xs ${
                        isActive ? "text-orange-200" : "text-zinc-500"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-zinc-800/80 rounded-xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
            />
          </div>
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Dumbbell className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">
                {exercises.length === 0
                  ? "Упражнения появятся после первой тренировки"
                  : "Нет упражнений в этой категории"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([group, exs]) => (
                <div key={group}>
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 px-1">
                    {group}
                  </h3>
                  <div className="space-y-1">
                    {exs.map((exercise) => {
                      const isSelected = selectedIds.includes(exercise.id);
                      return (
                        <button
                          key={exercise.id}
                          onClick={() => onToggle(exercise.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800 transition-colors"
                        >
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-orange-500 border-orange-500"
                                : "border-zinc-600 bg-transparent"
                            }`}
                          >
                            {isSelected && (
                              <Check
                                className="w-3 h-3 text-white"
                                strokeWidth={3}
                              />
                            )}
                          </div>
                          <span className="text-sm font-medium text-white">
                            {exercise.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors"
          >
            Готово ({selectedIds.length})
          </button>
        </div>

        <style jsx>{`
          @keyframes slide-up {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
          .animate-slide-up {
            animation: slide-up 0.3s ease-out forwards;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
    </div>
  );
}
