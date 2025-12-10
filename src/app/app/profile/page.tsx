"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  LogOut,
  Mail,
  Calendar,
  Loader2,
  FileText,
  ChevronRight,
} from "lucide-react";

interface UserProfile {
  email: string;
  createdAt: string;
  displayName: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      setProfile({
        email: user.email || "",
        createdAt: user.created_at,
        displayName: null,
      });
      setLoading(false);
    }

    loadProfile();
  }, [supabase, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/auth");
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: "60vh" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Профиль" />

      {/* Аватар и информация */}
      <div className="card mb-lg" style={{ textAlign: "center" }}>
        <div
          className="flex-center"
          style={{
            width: 80,
            height: 80,
            borderRadius: "var(--radius-full)",
            background: "var(--bg-elevated)",
            margin: "0 auto var(--space-lg)",
          }}
        >
          <User size={40} className="text-muted" />
        </div>

        <div className="flex flex-col gap-sm">
          <div className="flex items-center justify-center gap-sm">
            <Mail size={16} className="text-muted" />
            <span>{profile?.email}</span>
          </div>

          {profile?.createdAt && (
            <div className="flex items-center justify-center gap-sm text-caption">
              <Calendar size={14} />
              <span>
                С нами с{" "}
                {new Date(profile.createdAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Действия */}
      <div className="flex flex-col gap-sm">
        <Link
          href="/app/templates"
          className="card card-interactive"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-md)",
          }}
        >
          <div className="flex items-center gap-sm">
            <FileText size={20} className="text-accent" />
            <span>Мои шаблоны</span>
          </div>
          <ChevronRight size={18} className="text-muted" />
        </Link>

        <button
          className="btn btn-secondary btn-wide"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{ marginTop: "var(--space-md)" }}
        >
          {loggingOut ? (
            <Loader2
              size={18}
              style={{ animation: "spin 0.8s linear infinite" }}
            />
          ) : (
            <LogOut size={18} />
          )}
          Выйти из аккаунта
        </button>
      </div>

      {/* Версия */}
      <div
        className="text-caption text-center"
        style={{ marginTop: "var(--space-2xl)" }}
      >
        GymTrack v0.1.0 (MVP)
      </div>
    </>
  );
}
