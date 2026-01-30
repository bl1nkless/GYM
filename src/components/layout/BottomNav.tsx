"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore, useState, useEffect } from "react";
import { Activity, Plus, X, Dumbbell, FileText, Zap } from "lucide-react";
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

function subscribeToActiveWorkout(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener("active-workout-change", handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("active-workout-change", handler);
  };
}

function getActiveWorkoutSnapshot() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("activeWorkoutId");
}

function getActiveWorkoutServerSnapshot() {
  return null;
}

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname.startsWith(path);

  if (
    pathname.startsWith("/app/workouts/active") ||
    pathname.startsWith("/app/workouts/new")
  ) {
    return null;
  }

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-zinc-800 z-50 pb-safe">
      <div className="max-w-2xl mx-auto flex justify-around items-center h-16 px-4">
        <Link
          href="/app/workouts"
          className="flex flex-col items-center gap-1 py-2"
        >
          <svg
            className={`w-6 h-6 ${
              isActive("/app/workouts") ? "text-orange-500" : "text-zinc-500"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h2v12H4zM18 6h2v12h-2zM8 10h8v4H8z"
            />
          </svg>
          <span
            className={`text-[10px] font-medium ${
              isActive("/app/workouts") ? "text-orange-500" : "text-zinc-500"
            }`}
          >
            Тренировки
          </span>
        </Link>

        <Link
          href="/app/analytics"
          className="flex flex-col items-center gap-1 py-2"
        >
          <svg
            className={`w-6 h-6 ${
              isActive("/app/analytics") ? "text-orange-500" : "text-zinc-500"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <span
            className={`text-[10px] font-medium ${
              isActive("/app/analytics") ? "text-orange-500" : "text-zinc-500"
            }`}
          >
            Аналитика
          </span>
        </Link>

        <Link
          href="/app/profile"
          className="flex flex-col items-center gap-1 py-2"
        >
          <svg
            className={`w-6 h-6 ${
              isActive("/app/profile") ? "text-orange-500" : "text-zinc-500"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span
            className={`text-[10px] font-medium ${
              isActive("/app/profile") ? "text-orange-500" : "text-zinc-500"
            }`}
          >
            Профиль
          </span>
        </Link>
      </div>

      <style jsx>{`
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </nav>
  );
}

// Модальное окно выбора шаблона
function TemplatePickerModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchTemplates() {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

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
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error loading templates:", error);
        setLoading(false);
        return;
      }

      setTemplates(data as unknown as Template[]);
      setLoading(false);
    }

    fetchTemplates();
  }, [isOpen]);

  const handleStartEmpty = () => {
    onClose();
    router.push("/app/workouts/active");
  };

  const handleStartWithTemplate = (templateId: string) => {
    onClose();
    router.push(`/app/workouts/active?template=${templateId}`);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-lg bg-zinc-900 rounded-t-3xl border-t border-zinc-700 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-zinc-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4">
          <h2 className="text-xl font-bold text-white">Начать тренировку</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-8 space-y-3">
          {/* Empty Workout Option */}
          <button
            onClick={handleStartEmpty}
            className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl text-left group hover:from-orange-500 hover:to-orange-400 transition-all shadow-lg shadow-orange-500/20"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Пустая тренировка</h3>
              <p className="text-sm text-orange-100/80">
                Добавляй упражнения по ходу
              </p>
            </div>
            <Plus size={20} className="text-white/60" />
          </button>

          {/* Templates Section */}
          {loading ? (
            <div className="space-y-3 pt-2">
              <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-zinc-800 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : templates.length > 0 ? (
            <>
              <div className="flex items-center gap-2 pt-3 pb-1">
                <Zap size={14} className="text-zinc-500" />
                <span className="text-sm font-medium text-zinc-500">
                  Быстрый старт из шаблона
                </span>
              </div>

              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleStartWithTemplate(template.id)}
                    className="w-full flex items-center gap-4 p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl text-left group hover:bg-zinc-800 hover:border-zinc-600 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-700 flex items-center justify-center group-hover:bg-zinc-600 transition-colors">
                      <FileText className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">
                        {template.name}
                      </h3>
                      <p className="text-xs text-zinc-500 truncate">
                        {template.workout_template_exercises?.length || 0}{" "}
                        упражнений •{" "}
                        {template.workout_template_exercises
                          ?.slice(0, 2)
                          .map((te) => te.exercises?.name)
                          .join(", ")}
                        {(template.workout_template_exercises?.length || 0) >
                          2 && "..."}
                      </p>
                    </div>
                    <div className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>

              {/* See All Templates Link */}
              <Link
                href="/app/templates"
                onClick={onClose}
                className="block text-center text-sm text-orange-500 hover:text-orange-400 pt-2 transition-colors"
              >
                Все шаблоны →
              </Link>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-zinc-500">
                У вас пока нет шаблонов. Создайте первый после завершения
                тренировки!
              </p>
            </div>
          )}
        </div>

        {/* Safe Area Padding */}
        <div className="h-safe" />
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
        .h-safe {
          height: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </div>
  );
}

export function NewWorkoutFAB() {
  const pathname = usePathname();
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const activeWorkoutId = useSyncExternalStore(
    subscribeToActiveWorkout,
    getActiveWorkoutSnapshot,
    getActiveWorkoutServerSnapshot,
  );

  if (
    pathname.startsWith("/app/workouts/new") ||
    pathname.startsWith("/app/workouts/active")
  ) {
    return null;
  }

  const isActive = Boolean(activeWorkoutId);
  const label = isActive ? "Вернуться к тренировке" : "Начать тренировку";

  const handleClick = (e: React.MouseEvent) => {
    if (isActive) {
      // Если есть активная тренировка - переходим к ней
      router.push("/app/workouts/active");
    } else {
      // Если нет активной тренировки - показываем выбор шаблона
      e.preventDefault();
      setShowPicker(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`fab-new-workout${isActive ? " active" : ""}`}
        aria-label={label}
        title={label}
      >
        {isActive ? <Activity size={22} /> : <Plus size={22} />}
      </button>

      <TemplatePickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
      />
    </>
  );
}
