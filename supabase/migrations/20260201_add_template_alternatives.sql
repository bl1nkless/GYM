ALTER TABLE public.workout_template_exercises
ADD COLUMN IF NOT EXISTS alternative_exercise_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
