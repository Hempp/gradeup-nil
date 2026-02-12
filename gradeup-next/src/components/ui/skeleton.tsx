import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-[var(--radius-md)]',
        className
      )}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-card)] rounded-[var(--radius-lg)] p-6 border border-[var(--border-color)]">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-[var(--bg-card)] rounded-[var(--radius-lg)] p-4 border border-[var(--border-color)]"
        >
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="bg-[var(--bg-card)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border-color)]">
        <Skeleton className="h-4 w-48" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] last:border-0"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonStats, SkeletonTable };
