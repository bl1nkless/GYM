"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, X, Plus, ChevronRight } from "lucide-react";
import type {
  ExerciseWithMuscleGroup,
  MuscleGroup,
} from "@/types/database.types";

interface ExercisePickerModalProps {
  onSelect: (exercise: ExerciseWithMuscleGroup) => void;
  onClose: () => void;
}

export function ExercisePickerModal({
  onSelect,
  onClose,
}: ExercisePickerModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExerciseWithMuscleGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [selectedMuscleGroupId, setSelectedMuscleGroupId] = useState<
    number | null
  >(null);
  const [creating, setCreating] = useState(false);

  const supabase = createClient();

  // Загружаем мышечные группы
  useEffect(() => {
    async function loadMuscleGroups() {
      const { data } = await supabase
        .from("muscle_groups")
        .select("*")
        .order("order_index");

      if (data) {
        setMuscleGroups(data);
      }
    }
    loadMuscleGroups();
  }, [supabase]);

  // Поиск упражнений
  const searchExercises = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      const normalized = searchQuery.trim().toLowerCase();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Ищем по названию и алиасам
      const { data, error } = await supabase
        .from("exercises")
        .select(
          `
        *,
        muscle_groups (*)
      `
        )
        .or(`normalized_name.ilike.%${normalized}%,is_global.eq.true`)
        .or(`user_id.eq.${user?.id || ""},is_global.eq.true`)
        .limit(15);

      if (error) {
        console.error("Search error:", error);
        setLoading(false);
        return;
      }

      // Фильтруем результаты на клиенте для более точного совпадения
      const filtered = (data || [])
        .filter(
          (ex) =>
            ex.normalized_name.includes(normalized) ||
            ex.name.toLowerCase().includes(normalized)
        )
        .slice(0, 10);

      setResults(filtered as ExerciseWithMuscleGroup[]);
      setLoading(false);
    },
    [supabase]
  );

  // Дебаунс поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      searchExercises(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchExercises]);

  // Создание нового упражнения
  const handleCreateExercise = async () => {
    if (!newExerciseName.trim() || !selectedMuscleGroupId) return;

    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const normalized = newExerciseName.trim().toLowerCase();

    // Создаём упражнение
    const { data: exercise, error } = await supabase
      .from("exercises")
      .insert({
        user_id: user.id,
        name: newExerciseName.trim(),
        normalized_name: normalized,
        primary_muscle_group_id: selectedMuscleGroupId,
        is_global: false,
      })
      .select(
        `
        *,
        muscle_groups (*)
      `
      )
      .single();

    if (error) {
      console.error("Error creating exercise:", error);
      setCreating(false);
      return;
    }

    // Добавляем алиас
    await supabase.from("exercise_aliases").insert({
      exercise_id: exercise.id,
      alias: newExerciseName.trim(),
      normalized_alias: normalized,
    });

    onSelect(exercise as ExerciseWithMuscleGroup);
    setCreating(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        <div className="modal-header">
          <h2 className="modal-title">
            {showCreateForm ? "Новое упражнение" : "Выбери упражнение"}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {!showCreateForm ? (
          <>
            {/* Поле поиска */}
            <div
              style={{ position: "relative", marginBottom: "var(--space-lg)" }}
            >
              <Search
                size={18}
                style={{
                  position: "absolute",
                  left: "var(--space-md)",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: "2.75rem" }}
                placeholder="Жим лёжа, присед, тяга..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Результаты поиска */}
            {loading ? (
              <div
                className="flex-center"
                style={{ padding: "var(--space-xl)" }}
              >
                <div className="spinner" />
              </div>
            ) : results.length > 0 ? (
              <div className="flex flex-col gap-sm">
                {results.map((exercise) => (
                  <button
                    key={exercise.id}
                    className="card card-interactive"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "var(--space-md)",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                    onClick={() => onSelect(exercise)}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{exercise.name}</div>
                      <div
                        className="text-caption"
                        style={{ color: "var(--accent-primary)" }}
                      >
                        {exercise.muscle_groups?.name}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted" />
                  </button>
                ))}
              </div>
            ) : query.length >= 2 ? (
              <div
                className="empty-state"
                style={{ padding: "var(--space-lg)" }}
              >
                <p className="text-small text-muted mb-md">
                  Упражнение «{query}» не найдено
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setNewExerciseName(query);
                    setShowCreateForm(true);
                  }}
                >
                  <Plus size={18} />
                  Создать упражнение
                </button>
              </div>
            ) : (
              <div
                className="text-center text-muted"
                style={{ padding: "var(--space-xl)" }}
              >
                Начни вводить название упражнения
              </div>
            )}

            {/* Кнопка создать своё */}
            {results.length > 0 && (
              <button
                className="btn btn-ghost btn-wide mt-lg"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus size={18} />
                Создать своё упражнение
              </button>
            )}
          </>
        ) : (
          <>
            {/* Форма создания */}
            <div className="input-group mb-md">
              <label className="input-label">Название</label>
              <input
                type="text"
                className="input"
                placeholder="Например: Жим гантелей на наклонной"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="input-group mb-lg">
              <label className="input-label">Мышечная группа</label>
              <div
                className="flex flex-wrap gap-sm"
                style={{ marginTop: "var(--space-sm)" }}
              >
                {muscleGroups.map((mg) => (
                  <button
                    key={mg.id}
                    className={`badge ${
                      selectedMuscleGroupId === mg.id ? "badge-muscle" : ""
                    }`}
                    style={{
                      cursor: "pointer",
                      padding: "var(--space-sm) var(--space-md)",
                      fontSize: "0.875rem",
                    }}
                    onClick={() => setSelectedMuscleGroupId(mg.id)}
                  >
                    {mg.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-sm">
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowCreateForm(false)}
              >
                Назад
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={
                  !newExerciseName.trim() || !selectedMuscleGroupId || creating
                }
                onClick={handleCreateExercise}
              >
                {creating ? "Создаём..." : "Создать"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
