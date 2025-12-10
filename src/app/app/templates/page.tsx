"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout";
import { createClient } from "@/lib/supabase/client";
import { FileText, Trash2, Loader2 } from "lucide-react";

interface TemplateExercise {
  id: string;
  exercises: {
    name: string;
    muscle_groups: {
      name: string;
    };
  };
}

interface Template {
  id: string;
  name: string;
  created_at: string;
  workout_template_exercises: TemplateExercise[];
}

function TemplateSkeleton() {
  return (
    <div className="flex flex-col gap-md">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card" style={{ padding: "var(--space-md)" }}>
          <div
            className="skeleton"
            style={{
              width: "60%",
              height: 20,
              marginBottom: "var(--space-sm)",
            }}
          />
          <div className="skeleton" style={{ width: "40%", height: 14 }} />
        </div>
      ))}
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchTemplates() {
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
          created_at,
          workout_template_exercises (
            id,
            exercises (
              name,
              muscle_groups (
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

    fetchTemplates();
  }, [supabase]);

  const handleDelete = async (templateId: string) => {
    if (!confirm("Удалить этот шаблон?")) return;

    setDeletingId(templateId);

    await supabase.from("workout_templates").delete().eq("id", templateId);

    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    setDeletingId(null);
  };

  return (
    <>
      <PageHeader title="Шаблоны" showBack />

      {loading ? (
        <TemplateSkeleton />
      ) : templates.length === 0 ? (
        <div className="empty-state">
          <FileText className="empty-icon" />
          <h2 className="empty-title">Нет шаблонов</h2>
          <p className="empty-description">
            Сохрани тренировку как шаблон, чтобы быстро начинать похожие
            тренировки
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          {templates.map((template) => (
            <div key={template.id} className="card">
              <div className="flex-between mb-sm">
                <h3 className="heading-3">{template.name}</h3>
                <button
                  className="btn btn-ghost btn-icon text-danger"
                  onClick={() => handleDelete(template.id)}
                  disabled={deletingId === template.id}
                >
                  {deletingId === template.id ? (
                    <Loader2
                      size={18}
                      style={{ animation: "spin 0.8s linear infinite" }}
                    />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </button>
              </div>

              <div className="flex flex-wrap gap-xs">
                {template.workout_template_exercises?.slice(0, 5).map((te) => (
                  <span key={te.id} className="badge">
                    {te.exercises?.name}
                  </span>
                ))}
                {(template.workout_template_exercises?.length || 0) > 5 && (
                  <span className="badge">
                    +{(template.workout_template_exercises?.length || 0) - 5}
                  </span>
                )}
              </div>

              <div className="text-caption mt-sm">
                {template.workout_template_exercises?.length || 0} упражнений
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
