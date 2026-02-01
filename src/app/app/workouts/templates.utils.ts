import type { TemplatePreview } from "@/hooks/useTemplatesPreview";

const TEMPLATE_COLORS = [
  "text-orange-500",
  "text-red-500",
  "text-blue-500",
  "text-green-500",
  "text-purple-500",
  "text-pink-500",
  "text-yellow-500",
  "text-cyan-500",
];

export const getTemplateColor = (name: string) => {
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TEMPLATE_COLORS[hash % TEMPLATE_COLORS.length];
};

export const getTemplateSub = (template: TemplatePreview) => {
  const exercises = template.workout_template_exercises || [];
  if (exercises.length === 0) return "Пустой шаблон";
  const names = exercises
    .slice(0, 2)
    .map((e) => e.exercises?.name)
    .filter(Boolean);
  const suffix = exercises.length > 2 ? "..." : "";
  return names.join(", ") + suffix;
};
