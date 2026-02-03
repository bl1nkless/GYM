"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TEMPLATES_PREVIEW_LIMIT,
  useTemplatesPreview,
} from "@/hooks/useTemplatesPreview";
import { BarbellIcon, PlusIcon, UploadIcon } from "@/components/icons";
import {
  getTemplateColor,
  getTemplateSub,
} from "@/app/app/workouts/templates.utils";
import { SkeletonList } from "./SkeletonList";

export function QuickStartSection() {
  const [seeding, setSeeding] = useState(false);
  const { templates, loading, reload } = useTemplatesPreview(
    TEMPLATES_PREVIEW_LIMIT
  );

  const handleSeedTemplates = async () => {
    setSeeding(true);
    try {
      const { seedDefaultTemplates } = await import("@/lib/seed-templates");
      const result = await seedDefaultTemplates();
      if (result.success) {
        await reload();
      } else {
        console.log(result.message);
      }
    } finally {
      setSeeding(false);
    }
  };

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-lg font-semibold text-white">Быстрый старт</h2>
        <Link
          href="/app/templates"
          className="cursor-pointer text-xs font-medium text-orange-500 hover:text-orange-400"
        >
          Все шаблоны
        </Link>
      </div>

      <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {/* New Template Card */}
        <Link
          href="/app/templates/new"
          className="group flex h-36 w-32 flex-shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 text-zinc-500 transition-all hover:border-orange-500 hover:bg-zinc-900/50 hover:text-orange-500"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 transition-colors group-hover:bg-orange-500/20">
            <PlusIcon />
          </div>
          <span className="text-sm font-semibold">Новая</span>
        </Link>

        {/* Loading State */}
        {loading && (
          <SkeletonList
            count={3}
            itemClassName="h-36 w-36 flex-shrink-0 rounded-xl border border-zinc-800 bg-zinc-900"
          />
        )}

        {/* Template Cards */}
        {!loading &&
          templates.map((template) => (
            <Link
              key={template.id}
              href={`/app/workouts/active?template=${template.id}`}
              className="flex h-36 w-36 flex-shrink-0 cursor-pointer flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
            >
              <BarbellIcon
                className={`h-6 w-6 ${getTemplateColor(template.name)}`}
              />
              <div>
                <h3 className="mb-0.5 truncate text-sm leading-tight font-bold text-white">
                  {template.name}
                </h3>
                <p className="truncate text-xs text-zinc-500">
                  {getTemplateSub(template)}
                </p>
              </div>
            </Link>
          ))}

        {/* No Templates - Load Default */}
        {!loading && templates.length === 0 && (
          <button
            onClick={handleSeedTemplates}
            disabled={seeding}
            className="flex h-36 w-48 flex-shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/20 to-orange-600/10 p-4 transition-all hover:border-orange-500/50"
          >
            <UploadIcon className="mb-2 h-8 w-8 text-orange-500" />
            <p className="text-center text-sm font-medium text-orange-400">
              {seeding ? "Загрузка..." : "Upper/Lower"}
            </p>
            <p className="mt-1 text-center text-xs text-zinc-500">
              Загрузить шаблоны
            </p>
          </button>
        )}
      </div>
    </section>
  );
}
