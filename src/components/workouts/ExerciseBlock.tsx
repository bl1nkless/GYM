"use client";

import { useState, useCallback } from "react";
import { ExerciseSwapModal } from "@/components/workouts/ExerciseSwapModal";
import type {
  WorkoutExerciseLocal,
  ExerciseWithMuscleGroup,
  PerceivedDifficulty,
  WorkoutSetLocal,
} from "@/types";

interface ExerciseBlockProps {
  exercise: WorkoutExerciseLocal;
  onUpdateSets: (sets: WorkoutSetLocal[]) => void;
  onUpdateDifficulty: (difficulty: PerceivedDifficulty) => void;
  onReplaceExercise: (exercise: ExerciseWithMuscleGroup) => void;
  onSetAlternative: (exercise: ExerciseWithMuscleGroup) => void;
  onClearAlternative: () => void;
  onUpdateAlternativeWeight: (weight: number | null) => void;
  onSaveAlternativeWeight: (weight: number | null) => void;
  onDelete: () => void;
  onSaveSet: (
    setIndex: number,
    weight: number,
    reps: number,
    isWarmup: boolean,
    tempId?: string
  ) => void;
}

export function ExerciseBlock({
  exercise,
  onUpdateSets,
  onUpdateDifficulty,
  onReplaceExercise,
  onSetAlternative,
  onClearAlternative,
  onUpdateAlternativeWeight,
  onSaveAlternativeWeight,
  onDelete,
  onSaveSet,
}: ExerciseBlockProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showAlternativeModal, setShowAlternativeModal] = useState(false);

  const handleAddSet = useCallback(() => {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: WorkoutSetLocal = {
      id: `temp-${Date.now()}`,
      weight: lastSet?.weight ?? exercise.recommendedWeight,
      reps: lastSet?.reps ?? null,
      isWarmup: false,
      isSaved: false,
    };
    onUpdateSets([...exercise.sets, newSet]);
  }, [exercise.sets, exercise.recommendedWeight, onUpdateSets]);

  const handleDeleteSet = useCallback(
    (setId: string) => {
      onUpdateSets(exercise.sets.filter((s) => s.id !== setId));
    },
    [exercise.sets, onUpdateSets]
  );

  const handleWeightChange = useCallback(
    (setId: string, value: string) => {
      const weight = value === "" ? null : parseFloat(value);
      onUpdateSets(
        exercise.sets.map((s) =>
          s.id === setId ? { ...s, weight, isSaved: false } : s
        )
      );
    },
    [exercise.sets, onUpdateSets]
  );

  const handleRepsChange = useCallback(
    (setId: string, value: string) => {
      const reps = value === "" ? null : parseInt(value, 10);
      onUpdateSets(
        exercise.sets.map((s) =>
          s.id === setId ? { ...s, reps, isSaved: false } : s
        )
      );
    },
    [exercise.sets, onUpdateSets]
  );

  const handleSetBlur = useCallback(
    (set: WorkoutSetLocal, index: number) => {
      if (!set.isSaved && set.weight !== null && set.reps !== null) {
        onSaveSet(index, set.weight, set.reps, set.isWarmup, set.id);
      }
    },
    [onSaveSet]
  );

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 p-4">
          <div>
            <h3 className="text-lg leading-tight font-bold text-white">
              {exercise.exercise.name}
            </h3>
            <p className="mt-0.5 text-xs text-orange-500">
              {exercise.exercise.muscle_groups?.name}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="-mr-2 rounded-xl p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
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
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute top-full right-0 z-10 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 shadow-xl">
                <button
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-700"
                  onClick={() => {
                    setShowMenu(false);
                    setShowSwapModal(true);
                  }}
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
                      d="M4 7h12m0 0l-3-3m3 3l-3 3M20 17H8m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  Заменить
                </button>
                <button
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-400 transition-colors hover:bg-zinc-700"
                  onClick={() => {
                    setShowMenu(false);
                    onDelete();
                  }}
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Удалить
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recommendation */}
        {exercise.recommendedWeight !== null && (
          <div className="flex items-center gap-2 border-b border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm text-orange-400">
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>
              Рекомендуем: <strong>{exercise.recommendedWeight} кг</strong>
            </span>
          </div>
        )}

        {/* Sets */}
        <div className="p-2">
          {/* Header Row */}
          <div className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 px-2 py-2 text-center text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            <span>Сет</span>
            <span>КГ</span>
            <span>Повт</span>
            <span></span>
          </div>

          {/* Set Rows */}
          <div className="space-y-1">
            {exercise.sets.map((set, index) => (
              <div
                key={set.id}
                className={`grid grid-cols-[40px_1fr_1fr_40px] items-center gap-2 rounded-xl p-2 transition-colors ${set.isSaved ? "bg-green-900/10" : "bg-transparent"}`}
              >
                <div className="flex justify-center">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      set.isWarmup
                        ? "border border-blue-800 bg-blue-900/50 text-blue-400"
                        : set.isSaved
                          ? "border border-green-800 bg-green-900 text-green-400"
                          : "border border-zinc-700 bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {set.isWarmup ? "Р" : index + 1}
                  </span>
                </div>

                <input
                  type="number"
                  placeholder="0"
                  value={set.weight ?? ""}
                  onChange={(e) => handleWeightChange(set.id, e.target.value)}
                  onBlur={() => handleSetBlur(set, index)}
                  step="0.5"
                  min="0"
                  className={`h-10 w-full rounded-lg border text-center text-lg font-medium placeholder-zinc-600 transition-all outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500 ${
                    set.isSaved
                      ? "border-green-800/50 bg-transparent text-green-400"
                      : "border-zinc-700 bg-zinc-800 text-white"
                  }`}
                />

                <input
                  type="number"
                  placeholder="0"
                  value={set.reps ?? ""}
                  onChange={(e) => handleRepsChange(set.id, e.target.value)}
                  onBlur={() => handleSetBlur(set, index)}
                  min="0"
                  className={`h-10 w-full rounded-lg border text-center text-lg font-medium placeholder-zinc-600 transition-all outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500 ${
                    set.isSaved
                      ? "border-green-800/50 bg-transparent text-green-400"
                      : "border-zinc-700 bg-zinc-800 text-white"
                  }`}
                />

                <button
                  onClick={() => handleDeleteSet(set.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add Set Button */}
          <button
            onClick={handleAddSet}
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

        {/* Alternative Exercise */}
        <div className="border-t border-zinc-800 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Альтернатива</span>
            <button
              type="button"
              className="text-xs font-semibold text-orange-400 transition-colors hover:text-orange-300"
              onClick={() => setShowAlternativeModal(true)}
            >
              {exercise.alternativeExercise ? "Заменить" : "Добавить"}
            </button>
          </div>

          {exercise.alternativeExercise ? (
            <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-800/50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {exercise.alternativeExercise.name}
                  </div>
                  <div className="text-xs text-orange-400">
                    {exercise.alternativeExercise.muscle_groups?.name}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs text-zinc-400 transition-colors hover:text-red-400"
                  onClick={onClearAlternative}
                >
                  Убрать
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">Вес (кг)</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={exercise.alternativeWeight ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    const parsed = value === "" ? null : Number(value);
                    onUpdateAlternativeWeight(
                      parsed === null || Number.isNaN(parsed) ? null : parsed
                    );
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    const parsed = value === "" ? null : Number(value);
                    onSaveAlternativeWeight(
                      parsed === null || Number.isNaN(parsed) ? null : parsed
                    );
                  }}
                  className="h-9 w-24 rounded-lg border border-zinc-700 bg-zinc-900 text-center text-sm font-semibold text-white placeholder-zinc-600 outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500"
                  placeholder="0"
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-500">
              Добавь упражнение на случай замены.
            </div>
          )}
        </div>

        {/* Difficulty */}
        <div className="border-t border-zinc-800 p-4">
          <span className="mb-3 block text-xs text-zinc-500">
            Как ощущалось?
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onUpdateDifficulty("easy")}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                exercise.perceivedDifficulty === "easy"
                  ? "bg-green-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              Легко
            </button>
            <button
              onClick={() => onUpdateDifficulty("ok")}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                exercise.perceivedDifficulty === "ok"
                  ? "bg-yellow-500 text-black"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              Норм
            </button>
            <button
              onClick={() => onUpdateDifficulty("hard")}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                exercise.perceivedDifficulty === "hard"
                  ? "bg-red-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              Тяжело
            </button>
          </div>
        </div>
      </div>

      <ExerciseSwapModal
        isOpen={showSwapModal}
        currentExercise={exercise.exercise}
        onClose={() => setShowSwapModal(false)}
        onSelect={(newExercise) => {
          onReplaceExercise(newExercise);
          setShowSwapModal(false);
        }}
      />

      <ExerciseSwapModal
        isOpen={showAlternativeModal}
        currentExercise={exercise.exercise}
        onClose={() => setShowAlternativeModal(false)}
        onSelect={(newExercise) => {
          onSetAlternative(newExercise);
          setShowAlternativeModal(false);
        }}
      />
    </>
  );
}
