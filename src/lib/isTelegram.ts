/**
 * Check if the app is running inside Telegram Mini App
 */
export const isTelegram = (): boolean =>
  typeof window !== "undefined" &&
  !!(window as unknown as { Telegram?: { WebApp?: { initData?: string } } })
    .Telegram?.WebApp?.initData;
