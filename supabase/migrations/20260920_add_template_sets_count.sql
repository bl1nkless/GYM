ALTER TABLE public.workout_template_exercises
ADD COLUMN IF NOT EXISTS sets_count integer NOT NULL DEFAULT 3;
