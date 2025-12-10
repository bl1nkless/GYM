-- ============================================
-- GymTrack Database Schema
-- Выполни этот SQL в Supabase SQL Editor
-- ============================================

-- 1. Мышечные группы (справочник)
CREATE TABLE IF NOT EXISTS muscle_groups (
  id SMALLSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  order_index INT NOT NULL DEFAULT 0
);

-- 2. Упражнения
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  primary_muscle_group_id SMALLINT NOT NULL REFERENCES muscle_groups(id),
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_normalized_name ON exercises(normalized_name);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(primary_muscle_group_id);

-- 3. Алиасы упражнений
CREATE TABLE IF NOT EXISTS exercise_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exercise_aliases_normalized ON exercise_aliases(normalized_alias);

-- 4. Тренировочные сессии
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT,
  note TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_performed_at ON workout_sessions(performed_at);

-- 5. Упражнения в тренировке
DO $$ BEGIN
  CREATE TYPE perceived_difficulty AS ENUM ('easy', 'ok', 'hard');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  order_index INT NOT NULL DEFAULT 0,
  note TEXT,
  perceived_difficulty perceived_difficulty
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);

-- 6. Подходы
CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_index INT NOT NULL DEFAULT 0,
  weight NUMERIC(6,2) NOT NULL,
  reps INT NOT NULL,
  rpe NUMERIC(3,1),
  is_warmup BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_exercise_id ON workout_sets(workout_exercise_id);

-- 7. Шаблоны тренировок
CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_templates_user_id ON workout_templates(user_id);

CREATE TABLE IF NOT EXISTS workout_template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  order_index INT NOT NULL DEFAULT 0
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_template_exercises ENABLE ROW LEVEL SECURITY;

-- Политики для workout_sessions
CREATE POLICY "Users can view own sessions" ON workout_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON workout_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON workout_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON workout_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Политики для workout_exercises
CREATE POLICY "Users can view own workout exercises" ON workout_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws 
      WHERE ws.id = workout_exercises.workout_id 
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workout exercises" ON workout_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions ws 
      WHERE ws.id = workout_exercises.workout_id 
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workout exercises" ON workout_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws 
      WHERE ws.id = workout_exercises.workout_id 
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete workout exercises" ON workout_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws 
      WHERE ws.id = workout_exercises.workout_id 
      AND ws.user_id = auth.uid()
    )
  );

-- Политики для workout_sets
CREATE POLICY "Users can view own sets" ON workout_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workout_sessions ws ON ws.id = we.workout_id
      WHERE we.id = workout_sets.workout_exercise_id 
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sets" ON workout_sets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workout_sessions ws ON ws.id = we.workout_id
      WHERE we.id = workout_sets.workout_exercise_id 
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sets" ON workout_sets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workout_sessions ws ON ws.id = we.workout_id
      WHERE we.id = workout_sets.workout_exercise_id 
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sets" ON workout_sets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workout_exercises we
      JOIN workout_sessions ws ON ws.id = we.workout_id
      WHERE we.id = workout_sets.workout_exercise_id 
      AND ws.user_id = auth.uid()
    )
  );

-- Политики для exercises
CREATE POLICY "Users can view global exercises" ON exercises
  FOR SELECT USING (is_global = true OR user_id = auth.uid());

CREATE POLICY "Users can create own exercises" ON exercises
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_global = false);

CREATE POLICY "Users can update own exercises" ON exercises
  FOR UPDATE USING (user_id = auth.uid());

-- Политики для exercise_aliases
CREATE POLICY "Users can view exercise aliases" ON exercise_aliases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM exercises e 
      WHERE e.id = exercise_aliases.exercise_id 
      AND (e.is_global = true OR e.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create exercise aliases" ON exercise_aliases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM exercises e 
      WHERE e.id = exercise_aliases.exercise_id 
      AND e.user_id = auth.uid()
    )
  );

-- muscle_groups доступны всем (справочник)
ALTER TABLE muscle_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view muscle groups" ON muscle_groups
  FOR SELECT USING (true);

-- ============================================
-- Seed Data: Мышечные группы
-- ============================================

INSERT INTO muscle_groups (name, slug, order_index) VALUES
  ('Грудь', 'chest', 1),
  ('Спина', 'back', 2),
  ('Плечи', 'shoulders', 3),
  ('Бицепс', 'biceps', 4),
  ('Трицепс', 'triceps', 5),
  ('Предплечья', 'forearms', 6),
  ('Квадрицепсы', 'quads', 7),
  ('Бицепс бедра', 'hamstrings', 8),
  ('Ягодицы', 'glutes', 9),
  ('Икры', 'calves', 10),
  ('Пресс', 'abs', 11),
  ('Трапеции', 'traps', 12)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Seed Data: Базовые упражнения
-- ============================================

-- Грудь
INSERT INTO exercises (name, normalized_name, primary_muscle_group_id, is_global) VALUES
  ('Жим штанги лёжа', 'жим штанги лёжа', 1, true),
  ('Жим гантелей лёжа', 'жим гантелей лёжа', 1, true),
  ('Жим на наклонной скамье', 'жим на наклонной скамье', 1, true),
  ('Разведение гантелей', 'разведение гантелей', 1, true),
  ('Сведение в кроссовере', 'сведение в кроссовере', 1, true),
  ('Отжимания от пола', 'отжимания от пола', 1, true),
  ('Отжимания на брусьях', 'отжимания на брусьях', 1, true)
ON CONFLICT DO NOTHING;

-- Спина
INSERT INTO exercises (name, normalized_name, primary_muscle_group_id, is_global) VALUES
  ('Подтягивания', 'подтягивания', 2, true),
  ('Тяга верхнего блока', 'тяга верхнего блока', 2, true),
  ('Тяга штанги в наклоне', 'тяга штанги в наклоне', 2, true),
  ('Тяга гантели в наклоне', 'тяга гантели в наклоне', 2, true),
  ('Тяга нижнего блока', 'тяга нижнего блока', 2, true),
  ('Становая тяга', 'становая тяга', 2, true),
  ('Гиперэкстензия', 'гиперэкстензия', 2, true)
ON CONFLICT DO NOTHING;

-- Плечи
INSERT INTO exercises (name, normalized_name, primary_muscle_group_id, is_global) VALUES
  ('Жим штанги стоя', 'жим штанги стоя', 3, true),
  ('Жим гантелей сидя', 'жим гантелей сидя', 3, true),
  ('Махи гантелями в стороны', 'махи гантелями в стороны', 3, true),
  ('Махи гантелями перед собой', 'махи гантелями перед собой', 3, true),
  ('Разведение в наклоне', 'разведение в наклоне', 3, true),
  ('Тяга штанги к подбородку', 'тяга штанги к подбородку', 3, true)
ON CONFLICT DO NOTHING;

-- Бицепс
INSERT INTO exercises (name, normalized_name, primary_muscle_group_id, is_global) VALUES
  ('Подъём штанги на бицепс', 'подъём штанги на бицепс', 4, true),
  ('Подъём гантелей на бицепс', 'подъём гантелей на бицепс', 4, true),
  ('Молотки', 'молотки', 4, true),
  ('Сгибания на скамье Скотта', 'сгибания на скамье скотта', 4, true),
  ('Концентрированные сгибания', 'концентрированные сгибания', 4, true)
ON CONFLICT DO NOTHING;

-- Трицепс
INSERT INTO exercises (name, normalized_name, primary_muscle_group_id, is_global) VALUES
  ('Французский жим', 'французский жим', 5, true),
  ('Разгибания на блоке', 'разгибания на блоке', 5, true),
  ('Жим узким хватом', 'жим узким хватом', 5, true),
  ('Разгибание гантели из-за головы', 'разгибание гантели из-за головы', 5, true),
  ('Отжимания узким хватом', 'отжимания узким хватом', 5, true)
ON CONFLICT DO NOTHING;

-- Ноги (квадрицепсы)
INSERT INTO exercises (name, normalized_name, primary_muscle_group_id, is_global) VALUES
  ('Приседания со штангой', 'приседания со штангой', 7, true),
  ('Фронтальные приседания', 'фронтальные приседания', 7, true),
  ('Жим ногами', 'жим ногами', 7, true),
  ('Разгибания ног в тренажёре', 'разгибания ног в тренажёре', 7, true),
  ('Выпады', 'выпады', 7, true),
  ('Гакк-приседания', 'гакк-приседания', 7, true)
ON CONFLICT DO NOTHING;

-- Бицепс бедра
INSERT INTO exercises (name, normalized_name, primary_muscle_group_id, is_global) VALUES
  ('Румынская тяга', 'румынская тяга', 8, true),
  ('Сгибания ног в тренажёре', 'сгибания ног в тренажёре', 8, true),
  ('Мёртвая тяга', 'мёртвая тяга', 8, true)
ON CONFLICT DO NOTHING;

-- Ягодицы
INSERT INTO exercises (name, normalized_name, primary_muscle_group_id, is_global) VALUES
  ('Ягодичный мост', 'ягодичный мост', 9, true),
  ('Отведение ноги в кроссовере', 'отведение ноги в кроссовере', 9, true)
ON CONFLICT DO NOTHING;

-- Икры
INSERT INTO exercises (name, normalized_name, primary_muscle_group_id, is_global) VALUES
  ('Подъём на носки стоя', 'подъём на носки стоя', 10, true),
  ('Подъём на носки сидя', 'подъём на носки сидя', 10, true)
ON CONFLICT DO NOTHING;

-- Пресс
INSERT INTO exercises (name, normalized_name, primary_muscle_group_id, is_global) VALUES
  ('Скручивания', 'скручивания', 11, true),
  ('Подъём ног в висе', 'подъём ног в висе', 11, true),
  ('Планка', 'планка', 11, true),
  ('Велосипед', 'велосипед', 11, true)
ON CONFLICT DO NOTHING;

-- Трапеции
INSERT INTO exercises (name, normalized_name, primary_muscle_group_id, is_global) VALUES
  ('Шраги со штангой', 'шраги со штангой', 12, true),
  ('Шраги с гантелями', 'шраги с гантелями', 12, true)
ON CONFLICT DO NOTHING;
