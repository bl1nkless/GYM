-- Миграция: SQL-функция для агрегации статистики упражнений на стороне БД
-- Это снижает объём передаваемых данных и ускоряет рендер

-- Функция get_exercise_stats
-- Возвращает агрегированную статистику (last_weight, max_weight, last_date) для списка упражнений
-- 
-- Параметры:
--   p_user: UUID пользователя
--   p_ids: массив UUID упражнений для анализа
--
-- Возвращает:
--   exercise_id: ID упражнения
--   last_weight: вес из последней тренировки
--   max_weight: максимальный вес за всё время
--   last_date: дата последней тренировки

CREATE OR REPLACE FUNCTION public.get_exercise_stats(p_user uuid, p_ids uuid[])
RETURNS TABLE (
  exercise_id uuid,
  last_weight numeric,
  max_weight numeric,
  last_date timestamptz
) 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  WITH session_stats AS (
    -- Группируем данные по упражнению и сессии, находим макс вес в каждой сессии
    SELECT 
      we.exercise_id,
      s.performed_at,
      COALESCE(MAX(ws.weight), 0) as session_max_weight
    FROM workout_exercises we
    INNER JOIN workout_sessions s ON s.id = we.workout_id
    LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
    WHERE s.user_id = p_user 
      AND we.exercise_id = ANY(p_ids)
      AND s.is_completed = true
    GROUP BY we.exercise_id, s.performed_at
  ),
  ranked_stats AS (
    -- Добавляем ранг по дате для определения последней тренировки
    SELECT 
      exercise_id,
      performed_at,
      session_max_weight,
      ROW_NUMBER() OVER (
        PARTITION BY exercise_id 
        ORDER BY performed_at DESC
      ) as rn
    FROM session_stats
  )
  SELECT 
    rs.exercise_id,
    -- Вес из последней тренировки
    MAX(CASE WHEN rs.rn = 1 THEN rs.session_max_weight ELSE 0 END) as last_weight,
    -- Максимальный вес за всё время
    MAX(rs.session_max_weight) as max_weight,
    -- Дата последней тренировки
    MAX(rs.performed_at) as last_date
  FROM ranked_stats rs
  GROUP BY rs.exercise_id;
$$;

-- Добавляем комментарий к функции
COMMENT ON FUNCTION public.get_exercise_stats(uuid, uuid[]) IS 
  'Возвращает агрегированную статистику упражнений: последний вес, максимальный вес, дата последней тренировки';

-- RLS политика: функция доступна только для аутентифицированных пользователей
-- (SECURITY DEFINER выполняет запрос от имени владельца функции)
