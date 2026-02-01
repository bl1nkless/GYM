/**
 * Чистые функции для расчёта статистики упражнений.
 * Их легко тестировать без моков React, Supabase и т.д.
 */

// Тип строки данных из БД (результат SELECT-запроса)
export type WorkoutExerciseRow = {
  exercise_id: string;
  exercises?: {
    name?: string;
    muscle_groups?: { name?: string } | null;
  } | null;
  workout_sessions: { performed_at: string };
  workout_sets?: { weight: number }[] | null;
};

// Агрегированная статистика по упражнению
export type ExerciseHistory = {
  exerciseId: string;
  exerciseName: string;
  muscleGroupName: string;
  lastWeight: number;
  maxWeight: number;
  lastDate: string;
  history: { date: string; weight: number }[];
};

/**
 * Строит статистику упражнений из сырых данных БД.
 * Чистая функция — легко покрывается unit-тестами.
 *
 * @param rows - Массив строк из БД с данными о workout_exercises
 * @returns Массив ExerciseHistory, отсортированный по дате
 */
export function buildExerciseStats(
  rows: WorkoutExerciseRow[]
): ExerciseHistory[] {
  const map = new Map<string, ExerciseHistory>();

  for (const r of rows) {
    const id = r.exercise_id;
    const name = r.exercises?.name ?? "Упражнение";
    const mg = r.exercises?.muscle_groups?.name ?? "";
    const date = r.workout_sessions.performed_at;

    // Находим максимальный вес в данной тренировке
    const maxSet = (r.workout_sets ?? []).reduce(
      (m, s) => Math.max(m, s?.weight ?? 0),
      0
    );

    // Получаем или создаём запись в map
    const acc = map.get(id) ?? {
      exerciseId: id,
      exerciseName: name,
      muscleGroupName: mg,
      lastWeight: 0,
      maxWeight: 0,
      lastDate: date,
      history: [],
    };

    // Обновляем общий максимум
    acc.maxWeight = Math.max(acc.maxWeight, maxSet);

    // Обновляем последний вес и дату, если текущая дата новее
    if (new Date(date) >= new Date(acc.lastDate)) {
      acc.lastDate = date;
      acc.lastWeight = maxSet;
    }

    // Добавляем в историю
    acc.history.push({ date, weight: maxSet });

    map.set(id, acc);
  }

  // Сортируем историю каждого упражнения по дате (от старых к новым)
  return [...map.values()].map((h) => ({
    ...h,
    history: h.history.sort((a, b) => +new Date(a.date) - +new Date(b.date)),
  }));
}
