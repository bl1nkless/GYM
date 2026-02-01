"use client";

import { useRouter } from "next/navigation";

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
    <header className="sticky top-0 z-40 -mx-4 -mt-6 mb-6 border-b border-zinc-800 bg-black/80 px-4 pt-12 pb-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="-ml-2 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <h1 className="text-xl font-bold text-white">{title}</h1>
        </div>
        {action && <div>{action}</div>}
      </div>
    </header>
  );
}
