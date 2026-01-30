"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface TelegramContextType {
  isTelegram: boolean;
  telegramUser: TelegramUser | null;
  supabaseUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const TelegramContext = createContext<TelegramContextType>({
  isTelegram: false,
  telegramUser: null,
  supabaseUser: null,
  isLoading: true,
  isAuthenticated: false,
});

export function useTelegram() {
  return useContext(TelegramContext);
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
          auth_date?: number;
          hash?: string;
          query_id?: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
        colorScheme: "light" | "dark";
        viewportHeight: number;
        viewportStableHeight: number;
        isExpanded: boolean;
        platform: string;
      };
    };
  }
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [isTelegram, setIsTelegram] = useState(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initTelegram() {
      // Проверяем есть ли Telegram WebApp
      if (typeof window !== "undefined" && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;

        setIsTelegram(true);
        tg.ready();
        tg.expand();

        const initData = tg.initData;
        const tgUser = tg.initDataUnsafe.user;

        if (tgUser) {
          setTelegramUser(tgUser);
        }

        if (initData) {
          // Авторизуемся через наш API
          try {
            const response = await fetch("/api/auth/telegram", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ initData }),
            });

            const data = await response.json();

            if (data.success && data.method === "credentials") {
              // Логинимся в Supabase
              const supabase = createClient();
              const { data: authData, error } =
                await supabase.auth.signInWithPassword({
                  email: data.email,
                  password: data.password,
                });

              if (!error && authData.user) {
                setSupabaseUser(authData.user);
              }
            }
          } catch (error) {
            console.error("Telegram auth error:", error);
          }
        }
      } else {
        // Обычный браузер - проверяем Supabase сессию
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setSupabaseUser(user);
        }
      }

      setIsLoading(false);
    }

    initTelegram();
  }, []);

  return (
    <TelegramContext.Provider
      value={{
        isTelegram,
        telegramUser,
        supabaseUser,
        isLoading,
        isAuthenticated: !!supabaseUser,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
}
