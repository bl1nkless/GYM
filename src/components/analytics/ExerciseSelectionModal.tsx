"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Search, Check, Dumbbell } from "lucide-react";

export interface ExerciseOption {
  id: string;
  name: string;
  muscleGroupName: string;
}

interface ExerciseSelectionModalProps {
  exercises: ExerciseOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}

// Категории мышечных групп
const MUSCLE_CATEGORIES: Record<string, string[]> = {
  all: [],
  upper: ["Грудь", "Спина", "Плечи", "Трапеции"],
  arms: ["Бицепс", "Трицепс", "Предплечья"],
  legs: ["Квадрицепсы", "Бицепс бедра", "Ягодицы", "Икры"],
  core: ["Пресс"],
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "Все",
  upper: "Верх",
  arms: "Руки",
  legs: "Ноги",
  core: "Кор",
};

export default function ExerciseSelectionModal({
  exercises,
  selectedIds,
  onToggle,
  onClose,
}: ExerciseSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Фильтрация по поиску и категории
  const filtered = exercises.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.muscleGroupName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      activeCategory === "all" ||
      MUSCLE_CATEGORIES[activeCategory]?.includes(e.muscleGroupName);

    return matchesSearch && matchesCategory;
  });

  const grouped = filtered.reduce(
    (acc, exercise) => {
      const group = exercise.muscleGroupName || "Другое";
      if (!acc[group]) acc[group] = [];
      acc[group].push(exercise);
      return acc;
    },
    {} as Record<string, ExerciseOption[]>,
  );

  // Подсчёт упражнений в каждой категории
  const getCategoryCount = (category: string) => {
    if (category === "all") return exercises.length;
    return exercises.filter((e) =>
      MUSCLE_CATEGORIES[category]?.includes(e.muscleGroupName),
    ).length;
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Закрытие по Esc
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  // Регистрация обработчика и блокировка скролла
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    // Фокус на поле поиска
    setTimeout(() => searchInputRef.current?.focus(), 100);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg h-[85vh] bg-zinc-900 rounded-t-3xl border-t border-zinc-800 shadow-2xl flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h2
            id="exercise-modal-title"
            className="text-xl font-bold text-white"
          >
            Выбрать упражнения
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 text-zinc-500 hover:text-white transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-5 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const count = getCategoryCount(key);
              const isActive = activeCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-orange-500 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span
                      className={`text-xs ${
                        isActive ? "text-orange-200" : "text-zinc-500"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-zinc-800/80 rounded-xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              aria-label="Поиск упражнений"
            />
          </div>
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Dumbbell className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">
                {exercises.length === 0
                  ? "Упражнения появятся после первой тренировки"
                  : "Нет упражнений в этой категории"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([group, exs]) => (
                <div key={group}>
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 px-1">
                    {group}
                  </h3>
                  <div className="space-y-1">
                    {exs.map((exercise) => {
                      const isSelected = selectedIds.includes(exercise.id);
                      return (
                        <button
                          key={exercise.id}
                          onClick={() => onToggle(exercise.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800 transition-colors"
                        >
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-orange-500 border-orange-500"
                                : "border-zinc-600 bg-transparent"
                            }`}
                          >
                            {isSelected && (
                              <Check
                                className="w-3 h-3 text-white"
                                strokeWidth={3}
                              />
                            )}
                          </div>
                          <span className="text-sm font-medium text-white">
                            {exercise.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors"
          >
            Готово ({selectedIds.length})
          </button>
        </div>

        <style jsx>{`
          @keyframes slide-up {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
          .animate-slide-up {
            animation: slide-up 0.3s ease-out forwards;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
    </div>
  );
}
