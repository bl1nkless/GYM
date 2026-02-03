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
import { isTelegram } from "@/lib/isTelegram";
import { createSupabaseSessionFromTelegram } from "@/lib/tgAuth";

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
  const [isTg, setIsTg] = useState(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const supabase = createClient();

      // Check if running inside Telegram
      if (isTelegram()) {
        const tg = window.Telegram!.WebApp;
        setIsTg(true);
        tg.ready();
        tg.expand();

        // Get Telegram user from initDataUnsafe
        const tgUser = tg.initDataUnsafe.user;
        if (tgUser) {
          setTelegramUser(tgUser);
        }

        try {
          // Authenticate with Supabase using Telegram initData
          await createSupabaseSessionFromTelegram(supabase);

          // Get the authenticated user
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            setSupabaseUser(user);
          }
        } catch (error) {
          console.error("Telegram auth error:", error);
        }
      } else {
        // Regular browser - check existing Supabase session
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setSupabaseUser(user);
        }
      }

      setIsLoading(false);
    }

    initAuth();
  }, []);

  return (
    <TelegramContext.Provider
      value={{
        isTelegram: isTg,
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
