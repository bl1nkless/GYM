"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseWithMuscleGroup } from "@/types";
import { ChevronRight, Search, X } from "lucide-react";

interface ExerciseSwapModalProps {
  isOpen: boolean;
  currentExercise: ExerciseWithMuscleGroup;
  allowedExerciseIds?: string[] | null;
  excludedExerciseIds?: string[];
  emptyText?: string;
  onClose: () => void;
  onSelect: (exercise: ExerciseWithMuscleGroup) => void;
}

export function ExerciseSwapModal({
  isOpen,
  currentExercise,
  allowedExerciseIds,
  excludedExerciseIds,
  emptyText = "Нет альтернатив для этой группы",
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
      setAlternatives([]);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const allowedIds = (allowedExerciseIds || []).filter(
        (id) => id && id !== currentExercise.id
      );

      if (allowedExerciseIds && allowedIds.length === 0) {
        if (!cancelled) {
          setAlternatives([]);
          setLoading(false);
        }
        return;
      }

      const queryBuilder = supabase
        .from("exercises")
        .select(
          `
          *,
          muscle_groups (*)
        `
        );

      const { data, error } = allowedExerciseIds
        ? await queryBuilder
            .in("id", allowedIds)
            .order("name", { ascending: true })
        : await queryBuilder
            .eq(
              "primary_muscle_group_id",
              currentExercise.primary_muscle_group_id
            )
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

      const excluded = new Set<string>([
        currentExercise.id,
        ...(excludedExerciseIds || []),
      ]);
      const filtered = (data || []).filter(
        (exercise) => !excluded.has(exercise.id)
      );

      setAlternatives(filtered as ExerciseWithMuscleGroup[]);
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
    allowedExerciseIds,
    excludedExerciseIds,
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
          <div className="gap-sm flex flex-col">
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
            <p className="text-small text-muted">{emptyText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
