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
    [onClose, isPending],
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
        className="relative w-full max-w-sm bg-zinc-900 rounded-3xl border border-zinc-700 shadow-2xl p-6 space-y-6"
      >
        <h2
          id="weight-modal-title"
          className="text-xl font-bold text-white text-center"
        >
          Обновить вес
        </h2>

        {/* Current Weight */}
        <div className="space-y-2">
          <label id="current-weight-label" className="text-sm text-zinc-400">
            Текущий вес
          </label>
          <div
            className="flex items-center justify-center gap-4 bg-zinc-800 rounded-2xl p-4"
            role="group"
            aria-labelledby="current-weight-label"
          >
            <button
              ref={firstButtonRef}
              type="button"
              onClick={() => setWeight((w) => Math.max(30, w - 0.5))}
              className="w-10 h-10 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors disabled:opacity-50"
              disabled={isPending}
              aria-label="Уменьшить вес"
            >
              <Minus className="w-5 h-5 text-white" />
            </button>
            <div className="text-center" aria-live="polite">
              <span className="text-4xl font-bold text-white">{weight}</span>
              <span className="text-lg text-zinc-500 ml-1">кг</span>
            </div>
            <button
              type="button"
              onClick={() => setWeight((w) => Math.min(200, w + 0.5))}
              className="w-10 h-10 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors disabled:opacity-50"
              disabled={isPending}
              aria-label="Увеличить вес"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Goal Weight */}
        <div className="space-y-2">
          <label id="goal-weight-label" className="text-sm text-zinc-400">
            Цель по весу
          </label>
          <div
            className="flex items-center justify-center gap-4 bg-zinc-800 rounded-2xl p-4"
            role="group"
            aria-labelledby="goal-weight-label"
          >
            <button
              type="button"
              onClick={() => setGoal((g) => Math.max(30, g - 0.5))}
              className="w-10 h-10 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors disabled:opacity-50"
              disabled={isPending}
              aria-label="Уменьшить цель"
            >
              <Minus className="w-5 h-5 text-white" />
            </button>
            <div className="text-center" aria-live="polite">
              <span className="text-4xl font-bold text-white">{goal}</span>
              <span className="text-lg text-zinc-500 ml-1">кг</span>
            </div>
            <button
              type="button"
              onClick={() => setGoal((g) => Math.min(200, g + 0.5))}
              className="w-10 h-10 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors disabled:opacity-50"
              disabled={isPending}
              aria-label="Увеличить цель"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
            disabled={isPending}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => onSave(weight, goal)}
            className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
