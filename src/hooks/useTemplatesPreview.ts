"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface TemplateExercise {
  id: string;
  exercises: {
    name: string;
    muscle_groups: {
      name: string;
    } | null;
  } | null;
}

export interface TemplatePreview {
  id: string;
  name: string;
  created_at: string;
  workout_template_exercises: TemplateExercise[] | null;
}

export const TEMPLATES_PREVIEW_LIMIT = 5;

const TEMPLATE_SELECT = `
  id,
  name,
  created_at,
  workout_template_exercises (
    id,
    exercises (
      name,
      muscle_groups ( name )
    )
  )
`;

export function useTemplatesPreview(limit = TEMPLATES_PREVIEW_LIMIT) {
  const supabase = useMemo(() => createClient(), []);
  const [templates, setTemplates] = useState<TemplatePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!alive.current) return;
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      if (userError) {
        console.error("Error loading templates user:", userError);
      }
      if (alive.current) {
        setTemplates([]);
        setLoading(false);
      }
      return;
    }

    const { data, error } = await supabase
      .from("workout_templates")
      .select(TEMPLATE_SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!alive.current) return;

    if (error) {
      console.error("Error loading templates:", error);
      setTemplates([]);
    } else {
      setTemplates((data ?? []) as TemplatePreview[]);
    }

    setLoading(false);
  }, [supabase, limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { templates, loading, reload };
}
