# 📐 Code Style Guide

## Структура компонента

Компоненты должны следовать порядку:

```typescript
// 1. imports
import { useState, useCallback } from "react";
import { SomeComponent } from "@/components/...";
import type { SomeType } from "@/types";

// 2. types/interfaces (если локальные)
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

// 3. компонент
export function MyComponent({ title, onAction }: MyComponentProps) {
  // — props (деструктуризация в сигнатуре)

  // — state
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // — refs
  const inputRef = useRef<HTMLInputElement>(null);

  // — derived state / computed
  const computedTotal = useMemo(() => count * 2, [count]);

  // — effects
  useEffect(() => {
    // ...
  }, []);

  // — handlers
  const handleClick = useCallback(() => {
    setCount((c) => c + 1);
    onAction();
  }, [onAction]);

  const handleSubmit = useCallback(async () => {
    // ...
  }, []);

  // — render helpers (если нужны)
  const renderItem = (item: Item) => (
    <div>{item.name}</div>
  );

  // — return
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={handleClick}>Count: {count}</button>
    </div>
  );
}
```

## Нейминг

| Префикс        | Назначение                             | Пример                                        |
| -------------- | -------------------------------------- | --------------------------------------------- |
| `handle*`      | Обработчики событий UI                 | `handleClick`, `handleSubmit`, `handleChange` |
| `load*`        | Загрузка данных                        | `loadExerciseHistory`, `loadUserData`         |
| `compute*`     | Вычисления                             | `computeTotal`, `computeProgress`             |
| `on*`          | Props-колбэки передаваемые в компонент | `onSave`, `onClose`, `onChange`               |
| `is*` / `has*` | Булевы значения                        | `isLoading`, `hasError`, `isOpen`             |
| `set*`         | Сеттеры useState                       | `setCount`, `setIsOpen`                       |

## Файловая структура

```
src/
├── app/                    # Next.js App Router pages
│   └── app/
│       └── analytics/
│           ├── page.tsx    # Server Component (data fetching)
│           └── actions.ts  # Server Actions
├── components/
│   └── analytics/
│       ├── AnalyticsClient.tsx   # Client Component (state, UI)
│       ├── ExerciseCard.tsx      # Presentational component
│       └── WeightModal.tsx       # Modal component
├── lib/
│   ├── analytics/
│   │   └── buildExerciseStats.ts # Pure functions
│   └── supabase/
│       ├── client.ts             # Browser client
│       └── server.ts             # Server client
└── types/
    ├── database.types.ts         # Auto-generated Supabase types
    └── index.ts                  # Type aliases & custom types
```

## ESLint & Prettier

```bash
# Проверка стиля
npm run lint

# Автофикс ESLint
npm run lint:fix

# Форматирование Prettier
npm run format

# Проверка типов
npm run typecheck
```

## TypeScript Strict Mode

tsconfig.json уже включает `"strict": true`. Это означает:

- `noImplicitAny` — нельзя implicit any
- `strictNullChecks` — null и undefined проверяются
- `strictFunctionTypes` — строгая проверка функций
- `strictPropertyInitialization` — инициализация свойств классов

## Импорты

Используй алиасы:

```typescript
import { ExerciseWithMuscleGroup } from "@/types";
import { createClient } from "@/lib/supabase/client";
```

Не используй:

```typescript
import { ... } from "../../../../types"; // ❌
```
