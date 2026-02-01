"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExercisePickerModal } from "@/components/workouts/ExercisePickerModal";
import type { ExerciseWithMuscleGroup } from "@/types";

// --- ТИПЫ (Локальные для макета) ---
interface Exercise {
  id: string;
  name: string;
  primary_muscle_group_id: number;
}

interface LocalSet {
  id: string;
  weight: string;
  reps: string;
  isCompleted: boolean;
}

// --- MOCK DATA ---
const MOCK_ALTERNATIVES: Exercise[] = [
  { id: "alt1", name: "Жим гантелей лёжа", primary_muscle_group_id: 1 },
  { id: "alt2", name: "Отжимания на брусьях", primary_muscle_group_id: 1 },
  { id: "alt3", name: "Жим в хаммере", primary_muscle_group_id: 1 },
];

const INITIAL_EXERCISES: Exercise[] = [
  { id: "1", name: "Жим штанги лёжа", primary_muscle_group_id: 1 },
  { id: "2", name: "Разведение гантелей", primary_muscle_group_id: 1 },
];

// --- КОМПОНЕНТ 1: Модальное окно замены ---
function SwapExerciseModal({
  isOpen,
  onClose,
  currentExercise,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentExercise: Exercise;
  onSelect: (ex: Exercise) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="animate-in slide-in-from-bottom relative flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-zinc-900 shadow-2xl ring-1 ring-white/10 duration-200 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h3 className="text-lg font-bold text-white">Альтернативы</h3>
          <button
            onClick={onClose}
            className="rounded-full bg-zinc-800 p-2 text-zinc-400 transition-colors hover:text-white"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="border-b border-blue-900/30 bg-blue-900/20 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-blue-300">
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Замена для:{" "}
            <span className="font-semibold text-blue-200">
              {currentExercise.name}
            </span>
          </p>
        </div>

        <div className="space-y-1 overflow-y-auto p-2">
          {MOCK_ALTERNATIVES.map((alt) => (
            <button
              key={alt.id}
              onClick={() => {
                onSelect(alt);
                onClose();
              }}
              className="group flex w-full items-center justify-between rounded-xl border border-transparent p-4 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800"
            >
              <span className="font-medium text-zinc-200 transition-colors group-hover:text-blue-400">
                {alt.name}
              </span>
              <svg
                className="h-5 w-5 text-zinc-600 group-hover:text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- КОМПОНЕНТ 2: Блок упражнения ---
function ActiveExerciseBlock({
  exercise,
  onReplaceExercise,
  onDelete,
}: {
  exercise: Exercise;
  onReplaceExercise: (newEx: Exercise) => void;
  onDelete: () => void;
}) {
  const [sets, setSets] = useState<LocalSet[]>([
    { id: "1", weight: "80", reps: "10", isCompleted: false },
    { id: "2", weight: "", reps: "", isCompleted: false },
  ]);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const lastWorkingWeight = 80; // Mock значение

  const toggleSetCompletion = (index: number) => {
    setSets((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, isCompleted: !s.isCompleted } : s
      )
    );
  };

  const updateSet = (index: number, field: keyof LocalSet, value: string) => {
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-lg">
      <div className="flex items-start justify-between border-b border-zinc-800 p-4">
        <div>
          <h3 className="text-lg leading-tight font-bold text-white">
            {exercise.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
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
                  d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                />
              </svg>
              <span>
                Рабочий вес:{" "}
                <span className="font-semibold text-white">
                  {lastWorkingWeight} кг
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="-mr-2 flex items-center gap-1">
          <button
            onClick={() => setIsSwapModalOpen(true)}
            className="rounded-xl p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-blue-400"
            title="Заменить упражнение"
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
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="rounded-xl p-2 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
            title="Удалить упражнение"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-2">
        <div className="grid grid-cols-[30px_1fr_1fr_40px] gap-3 px-2 py-2 text-center text-xs font-semibold tracking-wider text-zinc-500 uppercase">
          <span>Сет</span>
          <span>КГ</span>
          <span>Повт</span>
          <span>✔</span>
        </div>

        <div className="space-y-1">
          {sets.map((set, index) => (
            <div
              key={set.id}
              className={`grid grid-cols-[30px_1fr_1fr_40px] items-center gap-3 rounded-xl p-2 transition-colors duration-200 ${set.isCompleted ? "bg-green-900/20" : "bg-transparent"}`}
            >
              <div className="flex justify-center">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    set.isCompleted
                      ? "border border-green-800 bg-green-900 text-green-400"
                      : "border border-zinc-700 bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {index + 1}
                </span>
              </div>

              <input
                type="number"
                placeholder={String(lastWorkingWeight)}
                value={set.weight}
                onChange={(e) => updateSet(index, "weight", e.target.value)}
                className={`h-10 w-full rounded-lg border text-center text-lg font-medium placeholder-zinc-600 transition-all outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                  set.isCompleted
                    ? "border-green-800/50 bg-transparent text-green-400"
                    : "border-zinc-700 bg-zinc-800 text-white"
                }`}
              />

              <input
                type="number"
                placeholder="-"
                value={set.reps}
                onChange={(e) => updateSet(index, "reps", e.target.value)}
                className={`h-10 w-full rounded-lg border text-center text-lg font-medium placeholder-zinc-600 transition-all outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                  set.isCompleted
                    ? "border-green-800/50 bg-transparent text-green-400"
                    : "border-zinc-700 bg-zinc-800 text-white"
                }`}
              />

              <button
                onClick={() => toggleSetCompletion(index)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 ${
                  set.isCompleted
                    ? "border-green-500 bg-green-600 text-white shadow-[0_0_10px_rgba(22,163,74,0.3)]"
                    : "border-zinc-700 bg-zinc-800 text-transparent hover:border-zinc-500"
                }`}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() =>
            setSets([
              ...sets,
              {
                id: Math.random().toString(),
                weight: "",
                reps: "",
                isCompleted: false,
              },
            ])
          }
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-800/50 py-3 text-sm font-semibold text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Добавить подход
        </button>
      </div>

      <SwapExerciseModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        currentExercise={exercise}
        onSelect={onReplaceExercise}
      />
    </div>
  );
}

// --- СТРАНИЦА (Main Page) ---
export default function ActiveWorkoutPage() {
  const [duration, setDuration] = useState(0);
  const [workoutName, setWorkoutName] = useState("День груди");
  const [exercises, setExercises] = useState<Exercise[]>(INITIAL_EXERCISES);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => setDuration((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleReplaceExercise = (exerciseId: string, newExercise: Exercise) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId ? { ...newExercise, id: ex.id } : ex
      )
    );
  };

  const handleDeleteExercise = (exerciseId: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
  };

  const handleAddExercise = (exercise: ExerciseWithMuscleGroup) => {
    const newExercise: Exercise = {
      id: `new-${Date.now()}`,
      name: exercise.name,
      primary_muscle_group_id: exercise.primary_muscle_group_id,
    };
    setExercises((prev) => [...prev, newExercise]);
    setShowExercisePicker(false);
  };

  const handleCloseWorkout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("activeWorkoutId");
      window.dispatchEvent(new Event("active-workout-change"));
    }
    router.push("/app/workouts");
  };

  return (
    <div className="min-h-screen bg-black pb-32">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/80 px-4 pt-12 pb-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Link>

          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <span className="font-mono text-sm font-medium text-zinc-300">
              {formatTime(duration)}
            </span>
          </div>

          <button
            onClick={handleCloseWorkout}
            className="-mr-2 rounded-full p-2 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-6">
        <div className="space-y-1">
          <label className="ml-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            Название
          </label>
          <input
            type="text"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            className="w-full border-none bg-transparent p-0 text-3xl font-extrabold text-white placeholder-zinc-700 focus:ring-0"
            placeholder="Название тренировки"
          />
        </div>

        <div className="space-y-4">
          {exercises.map((exercise) => (
            <ActiveExerciseBlock
              key={exercise.id}
              exercise={exercise}
              onReplaceExercise={(newEx) =>
                handleReplaceExercise(exercise.id, newEx)
              }
              onDelete={() => handleDeleteExercise(exercise.id)}
            />
          ))}
        </div>

        <button
          onClick={() => setShowExercisePicker(true)}
          className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-800 py-4 font-semibold text-zinc-500 transition-all duration-200 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400"
        >
          <svg
            className="h-6 w-6 transition-transform group-hover:scale-110"
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

      <div className="safe-area-bottom fixed right-0 bottom-0 left-0 z-50 border-t border-zinc-800 bg-black/90 p-4 pb-8 backdrop-blur-lg">
        <div className="mx-auto flex max-w-2xl gap-3">
          <button className="flex-1 rounded-xl bg-zinc-800 py-3.5 font-bold text-white transition-colors hover:bg-zinc-700">
            Пауза
          </button>
          <button className="flex-[2] rounded-xl bg-white py-3.5 font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-gray-100 active:scale-[0.98]">
            Завершить тренировку
          </button>
        </div>
      </div>

      {/* Exercise Picker Modal */}
      {showExercisePicker && (
        <ExercisePickerModal
          onSelect={handleAddExercise}
          onClose={() => setShowExercisePicker(false)}
        />
      )}
    </div>
  );
}
