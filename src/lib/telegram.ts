import crypto from "crypto";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface TelegramInitData {
  user?: TelegramUser;
  auth_date: number;
  hash: string;
  query_id?: string;
  [key: string]: unknown;
}

/**
 * Валидация initData от Telegram
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(
  initData: string,
  botToken: string
): TelegramInitData | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");

    if (!hash) return null;

    // Удаляем hash из параметров и сортируем
    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    // Создаем secret key
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // Вычисляем hash
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    // Сравниваем hash
    if (calculatedHash !== hash) {
      console.error("Telegram hash mismatch");
      return null;
    }

    // Проверяем auth_date (не старше 24 часов)
    const authDate = parseInt(params.get("auth_date") || "0");
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      console.error("Telegram auth_date expired");
      return null;
    }

    // Парсим данные
    const userStr = params.get("user");
    const user = userStr ? JSON.parse(userStr) : undefined;

    return {
      user,
      auth_date: authDate,
      hash,
      query_id: params.get("query_id") || undefined,
    };
  } catch (error) {
    console.error("Error validating Telegram initData:", error);
    return null;
  }
}

/**
 * Генерирует email для Telegram пользователя (для Supabase)
 */
export function getTelegramEmail(telegramId: number): string {
  return `tg_${telegramId}@telegram.gymapp.local`;
}

/**
 * Генерирует пароль для Telegram пользователя
 */
export function getTelegramPassword(
  telegramId: number,
  secret: string
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`telegram_user_${telegramId}`)
    .digest("hex");
}
