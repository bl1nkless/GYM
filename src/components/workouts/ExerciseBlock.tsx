"use client";

import { useState, useCallback } from "react";
import { Trash2, Plus, Zap, MoreVertical } from "lucide-react";
import type {
  WorkoutExerciseLocal,
  PerceivedDifficulty,
  WorkoutSetLocal,
} from "@/types/database.types";

interface ExerciseBlockProps {
  exercise: WorkoutExerciseLocal;
  onUpdateSets: (sets: WorkoutSetLocal[]) => void;
  onUpdateDifficulty: (difficulty: PerceivedDifficulty) => void;
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
  onDelete,
  onSaveSet,
}: ExerciseBlockProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Добавить подход
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

  // Удалить подход
  const handleDeleteSet = useCallback(
    (setId: string) => {
      onUpdateSets(exercise.sets.filter((s) => s.id !== setId));
    },
    [exercise.sets, onUpdateSets]
  );

  // Обновить вес
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

  // Обновить повторения
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

  // Сохранить подход при потере фокуса
  const handleSetBlur = useCallback(
    (set: WorkoutSetLocal, index: number) => {
      if (!set.isSaved && set.weight !== null && set.reps !== null) {
        onSaveSet(index, set.weight, set.reps, set.isWarmup, set.id);
      }
    },
    [onSaveSet]
  );

  return (
    <div className="exercise-block animate-slide-in">
      {/* Заголовок */}
      <div className="exercise-header">
        <div className="exercise-info">
          <span className="exercise-name">{exercise.exercise.name}</span>
          <span className="exercise-muscle">
            {exercise.exercise.muscle_groups?.name}
          </span>
        </div>
        <div style={{ position: "relative" }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical size={18} />
          </button>
          {showMenu && (
            <div
              className="card"
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                minWidth: 150,
                padding: "var(--space-sm)",
                zIndex: 10,
              }}
            >
              <button
                className="btn btn-ghost btn-wide text-danger"
                style={{ justifyContent: "flex-start" }}
                onClick={() => {
                  setShowMenu(false);
                  onDelete();
                }}
              >
                <Trash2 size={16} />
                Удалить
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Рекомендация */}
      {exercise.recommendedWeight !== null && (
        <div className="exercise-recommendation">
          <Zap size={16} className="exercise-recommendation-icon" />
          <span>
            Рекомендуем: <strong>{exercise.recommendedWeight} кг</strong>
          </span>
        </div>
      )}

      {/* Подходы */}
      <div className="sets-container">
        {exercise.sets.map((set, index) => (
          <div key={set.id} className="set-row">
            <div className={`set-number ${set.isWarmup ? "warmup" : ""}`}>
              {set.isWarmup ? "Р" : index + 1}
            </div>

            <div className="set-input-group">
              <span className="set-input-label">Вес (кг)</span>
              <input
                type="number"
                className="input input-sm input-number"
                placeholder="0"
                value={set.weight ?? ""}
                onChange={(e) => handleWeightChange(set.id, e.target.value)}
                onBlur={() => handleSetBlur(set, index)}
                step="0.5"
                min="0"
              />
            </div>

            <div className="set-input-group">
              <span className="set-input-label">Повт.</span>
              <input
                type="number"
                className="input input-sm input-number"
                placeholder="0"
                value={set.reps ?? ""}
                onChange={(e) => handleRepsChange(set.id, e.target.value)}
                onBlur={() => handleSetBlur(set, index)}
                min="0"
              />
            </div>

            <button
              className="set-delete"
              onClick={() => handleDeleteSet(set.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Добавить подход */}
      <button
        className="btn btn-ghost btn-sm btn-wide mt-md"
        onClick={handleAddSet}
      >
        <Plus size={16} />
        Добавить подход
      </button>

      {/* Ощущение */}
      <div style={{ marginTop: "var(--space-lg)" }}>
        <span className="text-caption mb-sm" style={{ display: "block" }}>
          Как ощущалось?
        </span>
        <div className="difficulty-group">
          <button
            className={`difficulty-btn easy ${
              exercise.perceivedDifficulty === "easy" ? "active" : ""
            }`}
            onClick={() => onUpdateDifficulty("easy")}
          >
            Легко
          </button>
          <button
            className={`difficulty-btn ok ${
              exercise.perceivedDifficulty === "ok" ? "active" : ""
            }`}
            onClick={() => onUpdateDifficulty("ok")}
          >
            Норм
          </button>
          <button
            className={`difficulty-btn hard ${
              exercise.perceivedDifficulty === "hard" ? "active" : ""
            }`}
            onClick={() => onUpdateDifficulty("hard")}
          >
            Тяжело
          </button>
        </div>
      </div>
    </div>
  );
}
