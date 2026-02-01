import { cn } from "@/lib/utils";

interface SkeletonListProps {
  count: number;
  itemClassName: string;
}

export function SkeletonList({ count, itemClassName }: SkeletonListProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("animate-pulse", itemClassName)} />
      ))}
    </>
  );
}
