# Деплой и обновления GymTrack

## Вариант 1: Vercel (Рекомендуется)

### Первоначальная настройка

```bash
# Установи Vercel CLI
npm i -g vercel

# Залогинься
vercel login

# Первый деплой
vercel

# Для production
vercel --prod
```

### Автоматические обновления

1. Свяжи проект с GitHub репозиторием
2. Каждый `git push` автоматически деплоит новую версию
3. Preview деплой для каждого Pull Request

### Настройка переменных окружения

В Dashboard Vercel → Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_AUTH_SECRET`

---

## Вариант 2: GitHub Actions + VPS

### Workflow файл

Создай `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Deploy to Server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /var/www/gymtrack
            git pull origin main
            npm ci
            npm run build
            pm2 restart gymtrack
```

---

## Вариант 3: Docker + Автообновление

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

### Docker Compose с Watchtower (автообновление)

```yaml
version: "3.8"

services:
  gymtrack:
    image: your-registry/gymtrack:latest
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    restart: always

  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 300 gymtrack
    restart: always
```

---

## Git Workflow

### Инициализация репозитория

```bash
# Инициализация Git
git init

# Добавить все файлы
git add .

# Первый коммит
git commit -m "Initial commit: GymTrack app"

# Создать репозиторий на GitHub и добавить remote
git remote add origin https://github.com/your-username/gymtrack.git

# Запушить
git push -u origin main
```

### Обновление приложения

```bash
# Внести изменения в код
# ...

# Закоммитить
git add .
git commit -m "feat: добавил новую функцию"

# Запушить (автоматически задеплоится)
git push
```

---

## Структура веток

```
main (production)
  ├── develop (staging)
  │     ├── feature/new-feature
  │     ├── fix/bug-fix
  │     └── ...
```

### Правила:

- `main` - только стабильные версии (автодеплой в production)
- `develop` - для тестирования (автодеплой в staging)
- `feature/*` - для новых функций
- `fix/*` - для исправлений

---

## Мониторинг и Логи

### Vercel

- Логи в Dashboard → Deployments → Logs
- Analytics встроен

### PM2 (VPS)

```bash
# Логи в реальном времени
pm2 logs gymtrack

# Мониторинг
pm2 monit
```

### Sentry (Error Tracking)

```bash
npm install @sentry/nextjs

# Настрой в sentry.client.config.ts
```

---

## Быстрые команды

```bash
# Локальная разработка
npm run dev

# Сборка
npm run build

# Запуск production
npm start

# Проверка типов
npx tsc --noEmit

# Линтинг
npm run lint

# Деплой (Vercel)
vercel --prod
```

---

## Полезные скрипты для package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "deploy": "vercel --prod",
    "deploy:preview": "vercel"
  }
}
```
