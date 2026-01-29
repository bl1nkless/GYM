"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
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
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-zinc-900 sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-lg font-bold text-white">
            {showCreateForm ? "Новое упражнение" : "Выбери упражнение"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-full transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {!showCreateForm ? (
            <>
              {/* Search Input */}
              <div className="relative mb-4">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
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
                  className="w-full h-12 pl-12 pr-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Results */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-2">
                  {results.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => onSelect(exercise)}
                      className="w-full text-left p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors group flex items-center justify-between border border-transparent hover:border-zinc-700"
                    >
                      <div>
                        <div className="font-semibold text-white group-hover:text-orange-400 transition-colors">
                          {exercise.name}
                        </div>
                        <div className="text-xs text-orange-500">
                          {exercise.muscle_groups?.name}
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-zinc-600 group-hover:text-orange-500"
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
                <div className="text-center py-8">
                  <p className="text-sm text-zinc-500 mb-4">
                    Упражнение «{query}» не найдено
                  </p>
                  <button
                    onClick={() => {
                      setNewExerciseName(query);
                      setShowCreateForm(true);
                    }}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all flex items-center gap-2 mx-auto"
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Создать упражнение
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500 text-sm">
                  Начни вводить название упражнения
                </div>
              )}

              {/* Create own button */}
              {results.length > 0 && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full mt-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-300 border border-dashed border-zinc-700 hover:border-zinc-600 rounded-xl transition-colors"
                >
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
              <div className="space-y-2 mb-4">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">
                  Название
                </label>
                <input
                  type="text"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="Например: Жим гантелей на наклонной"
                  autoFocus
                  className="w-full h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">
                  Мышечная группа
                </label>
                <div className="flex flex-wrap gap-2">
                  {muscleGroups.map((mg) => (
                    <button
                      key={mg.id}
                      onClick={() => setSelectedMuscleGroupId(mg.id)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all
                        ${
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
                  className="flex-1 py-3 bg-zinc-800 text-white font-semibold rounded-xl hover:bg-zinc-700 transition-colors"
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
                  className="flex-[2] py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50"
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
