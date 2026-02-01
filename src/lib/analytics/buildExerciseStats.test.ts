/**
 * Unit-тесты для buildExerciseStats
 *
 * Запуск: npx vitest run src/lib/analytics/buildExerciseStats.test.ts
 * Или в watch-режиме: npx vitest src/lib/analytics/buildExerciseStats.test.ts
 */

import { describe, it, expect } from "vitest";
import { buildExerciseStats, WorkoutExerciseRow } from "./buildExerciseStats";

describe("buildExerciseStats", () => {
  it("считает last/max и историю по упражнению", () => {
    const rows: WorkoutExerciseRow[] = [
      {
        exercise_id: "e1",
        exercises: { name: "Bench", muscle_groups: { name: "Chest" } },
        workout_sessions: { performed_at: "2025-12-01T10:00:00Z" },
        workout_sets: [{ weight: 80 }, { weight: 85 }],
      },
      {
        exercise_id: "e1",
        exercises: { name: "Bench", muscle_groups: { name: "Chest" } },
        workout_sessions: { performed_at: "2026-01-05T10:00:00Z" },
        workout_sets: [{ weight: 90 }],
      },
    ];
    const [e1] = buildExerciseStats(rows);
    expect(e1.maxWeight).toBe(90);
    expect(e1.lastWeight).toBe(90);
    expect(e1.lastDate).toBe("2026-01-05T10:00:00Z");
    expect(e1.history).toHaveLength(2);
  });

  it("возвращает пустой массив для пустого ввода", () => {
    const result = buildExerciseStats([]);
    expect(result).toEqual([]);
  });

  it("правильно обрабатывает несколько упражнений", () => {
    const rows: WorkoutExerciseRow[] = [
      {
        exercise_id: "e1",
        exercises: { name: "Squat", muscle_groups: { name: "Legs" } },
        workout_sessions: { performed_at: "2026-01-01T10:00:00Z" },
        workout_sets: [{ weight: 100 }],
      },
      {
        exercise_id: "e2",
        exercises: { name: "Deadlift", muscle_groups: { name: "Back" } },
        workout_sessions: { performed_at: "2026-01-02T10:00:00Z" },
        workout_sets: [{ weight: 120 }],
      },
    ];

    const result = buildExerciseStats(rows);

    expect(result.length).toBe(2);
    expect(result.find((e) => e.exerciseId === "e1")?.exerciseName).toBe(
      "Squat"
    );
    expect(result.find((e) => e.exerciseId === "e2")?.exerciseName).toBe(
      "Deadlift"
    );
  });

  it("обрабатывает пустые или null workout_sets", () => {
    const rows: WorkoutExerciseRow[] = [
      {
        exercise_id: "e1",
        exercises: { name: "Test", muscle_groups: { name: "Test" } },
        workout_sessions: { performed_at: "2026-01-01T10:00:00Z" },
        workout_sets: null,
      },
      {
        exercise_id: "e1",
        exercises: { name: "Test", muscle_groups: { name: "Test" } },
        workout_sessions: { performed_at: "2026-01-02T10:00:00Z" },
        workout_sets: [],
      },
    ];

    const result = buildExerciseStats(rows);

    expect(result.length).toBe(1);
    expect(result[0].maxWeight).toBe(0);
    expect(result[0].lastWeight).toBe(0);
  });

  it("правильно определяет lastDate как самую позднюю дату", () => {
    const rows: WorkoutExerciseRow[] = [
      {
        exercise_id: "e1",
        exercises: { name: "Bench", muscle_groups: { name: "Chest" } },
        workout_sessions: { performed_at: "2026-01-15T10:00:00Z" },
        workout_sets: [{ weight: 80 }],
      },
      {
        exercise_id: "e1",
        exercises: { name: "Bench", muscle_groups: { name: "Chest" } },
        workout_sessions: { performed_at: "2026-01-01T10:00:00Z" },
        workout_sets: [{ weight: 85 }],
      },
      {
        exercise_id: "e1",
        exercises: { name: "Bench", muscle_groups: { name: "Chest" } },
        workout_sessions: { performed_at: "2026-01-10T10:00:00Z" },
        workout_sets: [{ weight: 90 }],
      },
    ];

    const [e1] = buildExerciseStats(rows);

    expect(e1.lastDate).toBe("2026-01-15T10:00:00Z");
    expect(e1.lastWeight).toBe(80); // Вес из 15 января
    expect(e1.maxWeight).toBe(90); // Максимум был 10 января
  });

  it("сортирует историю от старых к новым", () => {
    const rows: WorkoutExerciseRow[] = [
      {
        exercise_id: "e1",
        exercises: { name: "Bench", muscle_groups: { name: "Chest" } },
        workout_sessions: { performed_at: "2026-01-03T10:00:00Z" },
        workout_sets: [{ weight: 90 }],
      },
      {
        exercise_id: "e1",
        exercises: { name: "Bench", muscle_groups: { name: "Chest" } },
        workout_sessions: { performed_at: "2026-01-01T10:00:00Z" },
        workout_sets: [{ weight: 80 }],
      },
      {
        exercise_id: "e1",
        exercises: { name: "Bench", muscle_groups: { name: "Chest" } },
        workout_sessions: { performed_at: "2026-01-02T10:00:00Z" },
        workout_sets: [{ weight: 85 }],
      },
    ];

    const [e1] = buildExerciseStats(rows);

    expect(e1.history[0].weight).toBe(80);
    expect(e1.history[1].weight).toBe(85);
    expect(e1.history[2].weight).toBe(90);
  });

  it("использует дефолтные значения при отсутствующих данных", () => {
    const rows: WorkoutExerciseRow[] = [
      {
        exercise_id: "e1",
        exercises: null,
        workout_sessions: { performed_at: "2026-01-01T10:00:00Z" },
        workout_sets: [{ weight: 50 }],
      },
      {
        exercise_id: "e2",
        exercises: { name: "Some", muscle_groups: null },
        workout_sessions: { performed_at: "2026-01-01T10:00:00Z" },
        workout_sets: [{ weight: 60 }],
      },
    ];

    const result = buildExerciseStats(rows);

    const e1 = result.find((e) => e.exerciseId === "e1");
    const e2 = result.find((e) => e.exerciseId === "e2");

    expect(e1?.exerciseName).toBe("Упражнение");
    expect(e1?.muscleGroupName).toBe("");
    expect(e2?.exerciseName).toBe("Some");
    expect(e2?.muscleGroupName).toBe("");
  });
});
