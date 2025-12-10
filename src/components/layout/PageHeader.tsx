"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  showBack = false,
  action,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className="flex-between mb-lg">
      <div className="flex items-center gap-sm">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="btn btn-ghost btn-icon"
            style={{ marginLeft: "-0.5rem" }}
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 className="heading-1">{title}</h1>
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}
