"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    <div className="min-h-screen bg-black pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-4 pt-12 pb-4">
        <div className="flex items-center gap-4 max-w-2xl mx-auto">
          <Link
            href="/app/profile"
            className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-zinc-800"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-white">Шаблоны</h1>
        </div>
      </header>

      <main className="px-4 pt-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-zinc-900 rounded-2xl animate-pulse border border-zinc-800"
              />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-zinc-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-zinc-400 mb-2">
              Нет шаблонов
            </h2>
            <p className="text-sm text-zinc-600">
              Сохрани тренировку как шаблон, чтобы быстро начинать похожие
              тренировки
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-white">{template.name}</h3>
                  <button
                    onClick={() => handleDelete(template.id)}
                    disabled={deletingId === template.id}
                    className="p-2 -mr-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {deletingId === template.id ? (
                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {template.workout_template_exercises
                    ?.slice(0, 5)
                    .map((te) => (
                      <span
                        key={te.id}
                        className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-zinc-400"
                      >
                        {te.exercises?.name}
                      </span>
                    ))}
                  {(template.workout_template_exercises?.length || 0) > 5 && (
                    <span className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-zinc-400">
                      +{(template.workout_template_exercises?.length || 0) - 5}
                    </span>
                  )}
                </div>

                <div className="text-xs text-zinc-500">
                  {template.workout_template_exercises?.length || 0} упражнений
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
