import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
}

export function EmptyState({ icon, title }: EmptyStateProps) {
  return (
    <div className="py-12 text-center text-sm text-zinc-500">
      {icon}
      {title}
    </div>
  );
}
