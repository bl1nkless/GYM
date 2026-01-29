"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseWithMuscleGroup } from "@/types/database.types";
import { ChevronRight, Search, X } from "lucide-react";

interface ExerciseSwapModalProps {
  isOpen: boolean;
  currentExercise: ExerciseWithMuscleGroup;
  onClose: () => void;
  onSelect: (exercise: ExerciseWithMuscleGroup) => void;
}

export function ExerciseSwapModal({
  isOpen,
  currentExercise,
  onClose,
  onSelect,
}: ExerciseSwapModalProps) {
  const [alternatives, setAlternatives] = useState<ExerciseWithMuscleGroup[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function loadAlternatives() {
      setLoading(true);
      setQuery("");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("exercises")
        .select(
          `
          *,
          muscle_groups (*)
        `
        )
        .eq("primary_muscle_group_id", currentExercise.primary_muscle_group_id)
        .neq("id", currentExercise.id)
        .or(`is_global.eq.true,user_id.eq.${user.id}`)
        .order("name", { ascending: true })
        .limit(30);

      if (cancelled) return;

      if (error) {
        console.error("Error loading alternatives:", error);
        setLoading(false);
        return;
      }

      setAlternatives((data || []) as ExerciseWithMuscleGroup[]);
      setLoading(false);
    }

    loadAlternatives();
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    currentExercise.id,
    currentExercise.primary_muscle_group_id,
    supabase,
  ]);

  if (!isOpen) return null;

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? alternatives.filter((exercise) =>
        exercise.name.toLowerCase().includes(normalizedQuery)
      )
    : alternatives;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        <div className="modal-header">
          <h2 className="modal-title">Альтернативы</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="text-small text-muted mb-md">
          Замена для:{" "}
          <span className="text-accent">{currentExercise.name}</span>
        </div>

        <div style={{ position: "relative", marginBottom: "var(--space-md)" }}>
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
            placeholder="Поиск альтернативы"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {loading ? (
          <div className="flex-center" style={{ padding: "var(--space-xl)" }}>
            <div className="spinner" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="flex flex-col gap-sm">
            {filtered.map((exercise) => (
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
                  {exercise.muscle_groups?.name && (
                    <div className="text-caption text-accent">
                      {exercise.muscle_groups.name}
                    </div>
                  )}
                </div>
                <ChevronRight size={18} className="text-muted" />
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: "var(--space-lg)" }}>
            <p className="text-small text-muted">
              Нет альтернатив для этой группы
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
