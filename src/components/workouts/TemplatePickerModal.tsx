"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, ChevronRight, X } from "lucide-react";

interface TemplateExercise {
  exercise_id: string;
  exercises: {
    id: string;
    name: string;
    primary_muscle_group_id: number;
    muscle_groups: {
      id: number;
      name: string;
    };
  };
}

interface Template {
  id: string;
  name: string;
  workout_template_exercises: TemplateExercise[];
}

interface TemplatePickerModalProps {
  onSelect: (template: Template) => void;
  onClose: () => void;
}

export function TemplatePickerModal({
  onSelect,
  onClose,
}: TemplatePickerModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadTemplates() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("workout_templates")
        .select(
          `
          id,
          name,
          workout_template_exercises (
            exercise_id,
            exercises (
              id,
              name,
              primary_muscle_group_id,
              muscle_groups (
                id,
                name
              )
            )
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading templates:", error);
        setLoading(false);
        return;
      }

      setTemplates(data as unknown as Template[]);
      setLoading(false);
    }

    loadTemplates();
  }, [supabase]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        <div className="modal-header">
          <h2 className="modal-title">Выбери шаблон</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-center" style={{ padding: "var(--space-xl)" }}>
            <div className="spinner" />
          </div>
        ) : templates.length === 0 ? (
          <div className="empty-state" style={{ padding: "var(--space-lg)" }}>
            <FileText size={48} className="text-muted mb-md" />
            <p className="text-small text-muted">Нет сохранённых шаблонов</p>
          </div>
        ) : (
          <div className="gap-sm flex flex-col">
            {templates.map((template) => (
              <button
                key={template.id}
                className="card card-interactive"
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  padding: "var(--space-md)",
                }}
                onClick={() => onSelect(template)}
              >
                <div className="flex-between">
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        marginBottom: "var(--space-xs)",
                      }}
                    >
                      {template.name}
                    </div>
                    <div className="gap-xs flex flex-wrap">
                      {template.workout_template_exercises
                        ?.slice(0, 3)
                        .map((te, i) => (
                          <span
                            key={i}
                            className="badge"
                            style={{ fontSize: "0.7rem" }}
                          >
                            {te.exercises?.name}
                          </span>
                        ))}
                      {(template.workout_template_exercises?.length || 0) >
                        3 && (
                        <span className="badge" style={{ fontSize: "0.7rem" }}>
                          +
                          {(template.workout_template_exercises?.length || 0) -
                            3}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
