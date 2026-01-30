# Настройка Telegram Mini App

## 1. Создание бота в Telegram

1. Открой [@BotFather](https://t.me/BotFather)
2. Отправь `/newbot` и следуй инструкциям
3. Сохрани токен бота (например: `7123456789:ABCdefGHIjklMNOpqrsTUVwxyz123456789`)
4. Отправь `/setmenubutton` и выбери своего бота
5. Введи URL твоего приложения (например: `https://gym.example.com`)

## 2. Настройка Mini App

1. Отправь [@BotFather](https://t.me/BotFather) команду `/mybots`
2. Выбери своего бота
3. Нажми "Bot Settings" → "Menu Button"
4. Или используй `/setmenubutton` → выбери бота → введи URL

## 3. Переменные окружения

Добавь в `.env.local`:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=7123456789:ABCdefGHIjklMNOpqrsTUVwxyz123456789
TELEGRAM_AUTH_SECRET=your-secret-key-for-password-generation

# Supabase (должен быть service_role ключ для создания пользователей)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 4. Деплой

Для работы Mini App нужен HTTPS. Варианты:

### Vercel (рекомендуется)

```bash
npm i -g vercel
vercel
```

### Cloudflare Tunnel (для локальной разработки)

```bash
cloudflared tunnel --url http://localhost:3000
```

### ngrok

```bash
ngrok http 3000
```

## 5. Как работает авторизация

```
┌─────────────────────────────────────────────────────────┐
│                    Telegram Mini App                     │
├─────────────────────────────────────────────────────────┤
│  1. Пользователь открывает бота                          │
│  2. Telegram передает initData с данными пользователя    │
│  3. Приложение отправляет initData на /api/auth/telegram │
│  4. Сервер валидирует подпись Telegram                   │
│  5. Создает/находит пользователя в Supabase              │
│  6. Возвращает credentials для входа                     │
│  7. Клиент логинится в Supabase                          │
│  8. Пользователь авторизован! 🎉                         │
└─────────────────────────────────────────────────────────┘
```

## 6. Файлы интеграции

- `src/lib/telegram.ts` - утилиты для валидации Telegram данных
- `src/app/api/auth/telegram/route.ts` - API endpoint авторизации
- `src/components/providers/TelegramProvider.tsx` - React провайдер
- `src/app/layout.tsx` - подключение SDK и провайдера

## 7. Использование в компонентах

```tsx
import { useTelegram } from "@/components/providers/TelegramProvider";

function MyComponent() {
  const { isTelegram, telegramUser, isAuthenticated, isLoading } =
    useTelegram();

  if (isLoading) return <div>Загрузка...</div>;

  if (isTelegram) {
    return <div>Привет, {telegramUser?.first_name}!</div>;
  }

  return <div>Обычный браузер</div>;
}
```

## 8. Особенности Telegram Mini App

### Кнопки

```tsx
// Main Button (внизу экрана)
window.Telegram?.WebApp.MainButton.text = "Сохранить";
window.Telegram?.WebApp.MainButton.show();
window.Telegram?.WebApp.MainButton.onClick(() => {
  // действие
});

// Back Button
window.Telegram?.WebApp.BackButton.show();
window.Telegram?.WebApp.BackButton.onClick(() => {
  router.back();
});
```

### Тема

```tsx
const colorScheme = window.Telegram?.WebApp.colorScheme; // "light" | "dark"
const themeParams = window.Telegram?.WebApp.themeParams;
```

### Закрыть приложение

```tsx
window.Telegram?.WebApp.close();
```

## 9. Troubleshooting

### "Invalid Telegram data"

- Проверь что TELEGRAM_BOT_TOKEN правильный
- Убедись что приложение открыто через Telegram (не в обычном браузере)

### "Bot token not configured"

- Добавь TELEGRAM_BOT_TOKEN в .env.local
- Перезапусти сервер

### "Failed to create user"

- Проверь SUPABASE_SERVICE_ROLE_KEY (должен быть service_role, не anon!)
- Проверь RLS политики в Supabase
