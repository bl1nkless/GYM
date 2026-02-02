import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  validateTelegramInitData,
  getTelegramEmail,
  getTelegramPassword,
} from "@/lib/telegram";

// Force dynamic rendering (not static)
export const dynamic = "force-dynamic";

// Helper to create Supabase Admin client lazily
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { initData } = await request.json();

    if (!initData) {
      return NextResponse.json(
        { error: "initData is required" },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "Bot token not configured" },
        { status: 500 }
      );
    }

    // Валидируем данные от Telegram
    const telegramData = validateTelegramInitData(initData, botToken);
    if (!telegramData || !telegramData.user) {
      return NextResponse.json(
        { error: "Invalid Telegram data" },
        { status: 401 }
      );
    }

    const { user: tgUser } = telegramData;
    const email = getTelegramEmail(tgUser.id);
    const password = getTelegramPassword(
      tgUser.id,
      process.env.TELEGRAM_AUTH_SECRET || botToken
    );

    // Проверяем существует ли пользователь
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: { email?: string }) => u.email === email
    );

    let userId: string;

    if (existingUser) {
      // Пользователь существует - логиним
      userId = existingUser.id;
    } else {
      // Создаем нового пользователя
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Автоматически подтверждаем email
          user_metadata: {
            telegram_id: tgUser.id,
            first_name: tgUser.first_name,
            last_name: tgUser.last_name,
            username: tgUser.username,
            photo_url: tgUser.photo_url,
          },
        });

      if (createError || !newUser.user) {
        console.error("Error creating user:", createError);
        return NextResponse.json(
          { error: "Failed to create user" },
          { status: 500 }
        );
      }

      userId = newUser.user.id;
    }

    // Создаем сессию через signInWithPassword (клиентская библиотека)
    // Или используем генерацию токена через Admin API
    const { data: session, error: signInError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (signInError) {
      console.error("Error generating session:", signInError);

      // Fallback: возвращаем email/password для клиентского логина
      return NextResponse.json({
        success: true,
        method: "credentials",
        email,
        password,
        user: {
          id: userId,
          telegram_id: tgUser.id,
          first_name: tgUser.first_name,
          username: tgUser.username,
        },
      });
    }

    return NextResponse.json({
      success: true,
      method: "link",
      link: session.properties?.action_link,
      user: {
        id: userId,
        telegram_id: tgUser.id,
        first_name: tgUser.first_name,
        username: tgUser.username,
      },
    });
  } catch (error) {
    console.error("Telegram auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
