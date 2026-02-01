"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseWithMuscleGroup, MuscleGroup } from "@/types";

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

  // Load muscle groups
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

  // Search exercises
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

      const { data, error } = await supabase
        .from("exercises")
        .select(`*, muscle_groups (*)`)
        .or(`normalized_name.ilike.%${normalized}%,is_global.eq.true`)
        .or(`user_id.eq.${user?.id || ""},is_global.eq.true`)
        .limit(15);

      if (error) {
        console.error("Search error:", error);
        setLoading(false);
        return;
      }

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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchExercises(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchExercises]);

  // Create new exercise
  const handleCreateExercise = async () => {
    if (!newExerciseName.trim() || !selectedMuscleGroupId) return;

    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const normalized = newExerciseName.trim().toLowerCase();

    const { data: exercise, error } = await supabase
      .from("exercises")
      .insert({
        user_id: user.id,
        name: newExerciseName.trim(),
        normalized_name: normalized,
        primary_muscle_group_id: selectedMuscleGroupId,
        is_global: false,
      })
      .select(`*, muscle_groups (*)`)
      .single();

    if (error) {
      console.error("Error creating exercise:", error);
      setCreating(false);
      return;
    }

    await supabase.from("exercise_aliases").insert({
      exercise_id: exercise.id,
      alias: newExerciseName.trim(),
      normalized_alias: normalized,
    });

    onSelect(exercise as ExerciseWithMuscleGroup);
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-zinc-900 shadow-2xl ring-1 ring-white/10 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h3 className="text-lg font-bold text-white">
            {showCreateForm ? "Новое упражнение" : "Выбери упражнение"}
          </h3>
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

        <div className="flex-1 overflow-y-auto p-4">
          {!showCreateForm ? (
            <>
              {/* Search Input */}
              <div className="relative mb-4">
                <svg
                  className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-zinc-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Жим лёжа, присед, тяга..."
                  autoFocus
                  className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-800 pr-4 pl-12 text-white placeholder-zinc-500 transition-all outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Results */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-2">
                  {results.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => onSelect(exercise)}
                      className="group flex w-full items-center justify-between rounded-xl border border-transparent bg-zinc-800/50 p-4 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800"
                    >
                      <div>
                        <div className="font-semibold text-white transition-colors group-hover:text-orange-400">
                          {exercise.name}
                        </div>
                        <div className="text-xs text-orange-500">
                          {exercise.muscle_groups?.name}
                        </div>
                      </div>
                      <svg
                        className="h-5 w-5 text-zinc-600 group-hover:text-orange-500"
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
              ) : query.length >= 2 ? (
                <div className="py-8 text-center">
                  <p className="mb-4 text-sm text-zinc-500">
                    Упражнение «{query}» не найдено
                  </p>
                  <button
                    onClick={() => {
                      setNewExerciseName(query);
                      setShowCreateForm(true);
                    }}
                    className="mx-auto flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600"
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
                    Создать упражнение
                  </button>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-zinc-500">
                  Начни вводить название упражнения
                </div>
              )}

              {/* Create own button */}
              {results.length > 0 && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 py-3 text-sm font-semibold text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
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
                  Создать своё упражнение
                </button>
              )}
            </>
          ) : (
            <>
              {/* Create Form */}
              <div className="mb-4 space-y-2">
                <label className="ml-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                  Название
                </label>
                <input
                  type="text"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="Например: Жим гантелей на наклонной"
                  autoFocus
                  className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-white placeholder-zinc-500 transition-all outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="mb-6 space-y-2">
                <label className="ml-1 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                  Мышечная группа
                </label>
                <div className="flex flex-wrap gap-2">
                  {muscleGroups.map((mg) => (
                    <button
                      key={mg.id}
                      onClick={() => setSelectedMuscleGroupId(mg.id)}
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                        selectedMuscleGroupId === mg.id
                          ? "bg-orange-500 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {mg.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 rounded-xl bg-zinc-800 py-3 font-semibold text-white transition-colors hover:bg-zinc-700"
                >
                  Назад
                </button>
                <button
                  onClick={handleCreateExercise}
                  disabled={
                    !newExerciseName.trim() ||
                    !selectedMuscleGroupId ||
                    creating
                  }
                  className="flex-[2] rounded-xl bg-orange-500 py-3 font-semibold text-white transition-all hover:bg-orange-600 disabled:opacity-50"
                >
                  {creating ? "Создаём..." : "Создать"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
