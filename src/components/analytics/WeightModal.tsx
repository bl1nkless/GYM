"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Minus, Plus } from "lucide-react";

interface WeightModalProps {
  currentWeight: number | null;
  goalWeight: number | null;
  onSave: (weight: number, goal: number) => void;
  onClose: () => void;
  isPending?: boolean;
}

export default function WeightModal({
  currentWeight,
  goalWeight,
  onSave,
  onClose,
  isPending = false,
}: WeightModalProps) {
  const [weight, setWeight] = useState(currentWeight || 70);
  const [goal, setGoal] = useState(goalWeight || 75);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Закрытие по Esc
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        onClose();
      }
    },
    [onClose, isPending]
  );

  // Focus trap и регистрация обработчика Esc
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    // Фокус на первую кнопку при открытии
    firstButtonRef.current?.focus();

    // Блокируем скролл body
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weight-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isPending ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className="relative w-full max-w-sm space-y-6 rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
      >
        <h2
          id="weight-modal-title"
          className="text-center text-xl font-bold text-white"
        >
          Обновить вес
        </h2>

        {/* Current Weight */}
        <div className="space-y-2">
          <label id="current-weight-label" className="text-sm text-zinc-400">
            Текущий вес
          </label>
          <div
            className="flex items-center justify-center gap-4 rounded-2xl bg-zinc-800 p-4"
            role="group"
            aria-labelledby="current-weight-label"
          >
            <button
              ref={firstButtonRef}
              type="button"
              onClick={() => setWeight((w) => Math.max(30, w - 0.5))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 transition-colors hover:bg-zinc-600 disabled:opacity-50"
              disabled={isPending}
              aria-label="Уменьшить вес"
            >
              <Minus className="h-5 w-5 text-white" />
            </button>
            <div className="text-center" aria-live="polite">
              <span className="text-4xl font-bold text-white">{weight}</span>
              <span className="ml-1 text-lg text-zinc-500">кг</span>
            </div>
            <button
              type="button"
              onClick={() => setWeight((w) => Math.min(200, w + 0.5))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 transition-colors hover:bg-zinc-600 disabled:opacity-50"
              disabled={isPending}
              aria-label="Увеличить вес"
            >
              <Plus className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Goal Weight */}
        <div className="space-y-2">
          <label id="goal-weight-label" className="text-sm text-zinc-400">
            Цель по весу
          </label>
          <div
            className="flex items-center justify-center gap-4 rounded-2xl bg-zinc-800 p-4"
            role="group"
            aria-labelledby="goal-weight-label"
          >
            <button
              type="button"
              onClick={() => setGoal((g) => Math.max(30, g - 0.5))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 transition-colors hover:bg-zinc-600 disabled:opacity-50"
              disabled={isPending}
              aria-label="Уменьшить цель"
            >
              <Minus className="h-5 w-5 text-white" />
            </button>
            <div className="text-center" aria-live="polite">
              <span className="text-4xl font-bold text-white">{goal}</span>
              <span className="ml-1 text-lg text-zinc-500">кг</span>
            </div>
            <button
              type="button"
              onClick={() => setGoal((g) => Math.min(200, g + 0.5))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 transition-colors hover:bg-zinc-600 disabled:opacity-50"
              disabled={isPending}
              aria-label="Увеличить цель"
            >
              <Plus className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-zinc-800 py-3 font-medium text-zinc-400 transition-colors hover:bg-zinc-700 disabled:opacity-50"
            disabled={isPending}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => onSave(weight, goal)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-medium text-white transition-colors hover:bg-orange-400 disabled:opacity-50"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Сохранение...
              </>
            ) : (
              "Сохранить"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
