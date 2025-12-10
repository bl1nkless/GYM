"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, BarChart3, User, Plus } from "lucide-react";

const navItems = [
  { href: "/app/workouts", label: "Тренировки", icon: Dumbbell },
  { href: "/app/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/app/profile", label: "Профиль", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="nav-bar">
      <div className="nav-bar-inner">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <Icon className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function NewWorkoutFAB() {
  const pathname = usePathname();

  // Не показываем FAB на странице создания тренировки
  if (pathname === "/app/workouts/new") {
    return null;
  }

  return (
    <Link href="/app/workouts/new" className="fab-new-workout">
      <Plus size={28} />
    </Link>
  );
}
