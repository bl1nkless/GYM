"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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

  const handleCreateTemplate = async () => {
    setCreating(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }

    const { data, error } = await supabase
      .from("workout_templates")
      .insert({ user_id: user.id, name: "Новый шаблон" })
      .select()
      .single();

    if (error || !data) {
      console.error("Error creating template:", error);
      setCreating(false);
      return;
    }

    setCreating(false);
    router.push(`/app/templates/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-black pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/80 px-4 pt-12 pb-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
          <Link
            href="/app/profile"
            className="-ml-2 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <svg
              className="h-6 w-6"
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
          <button
            onClick={handleCreateTemplate}
            disabled={creating}
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-orange-600 disabled:opacity-50"
          >
            {creating ? "Создаём..." : "Новый шаблон"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900"
              />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="py-16 text-center">
            <svg
              className="mx-auto mb-4 h-16 w-16 text-zinc-700"
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
            <h2 className="mb-2 text-lg font-semibold text-zinc-400">
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
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="font-semibold text-white">{template.name}</h3>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/app/templates/${template.id}`}
                      className="rounded-lg bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-700"
                    >
                      Редактировать
                    </Link>
                    <button
                      onClick={() => handleDelete(template.id)}
                      disabled={deletingId === template.id}
                      className="-mr-2 rounded-xl p-2 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    >
                      {deletingId === template.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                      ) : (
                        <svg
                          className="h-4 w-4"
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
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  {template.workout_template_exercises
                    ?.slice(0, 5)
                    .map((te) => (
                      <span
                        key={te.id}
                        className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400"
                      >
                        {te.exercises?.name}
                      </span>
                    ))}
                  {(template.workout_template_exercises?.length || 0) > 5 && (
                    <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
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
