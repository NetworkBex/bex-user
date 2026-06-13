'use client';

import { Skeleton } from '@/components/ui/Progress';
import { cn } from '@/lib/ui';

export function AnnouncementSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-surface-sunk',
        'min-h-[320px]',
        className,
      )}
      role="status"
      aria-label="Loading announcement"
    >
      <div className="relative p-5 md:p-6 flex flex-col gap-4 h-full">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <Skeleton mode="pulse" className="h-5 w-28 rounded-full" />
          <Skeleton mode="pulse" className="h-3.5 w-24 rounded" />
        </div>

        {/* Title + subtitle */}
        <div>
          <Skeleton mode="pulse" className="h-7 w-3/4 rounded mb-2" />
          <Skeleton mode="pulse" className="h-7 w-1/2 rounded mb-3" />
          <Skeleton mode="pulse" className="h-3.5 w-full rounded mb-1.5" />
          <Skeleton mode="pulse" className="h-3.5 w-4/5 rounded" />
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton mode="pulse" className="h-3 w-16 rounded mb-1.5" />
              <Skeleton mode="pulse" className="h-4 w-24 rounded" />
            </div>
          ))}
        </div>

        {/* Qualification paths */}
        <div className="rounded-lg border border-border bg-surface-2/40 p-4 space-y-3">
          <Skeleton mode="pulse" className="h-3.5 w-40 rounded" />
          <Skeleton mode="pulse" className="h-2 w-full rounded-full" />
          <Skeleton mode="pulse" className="h-2 w-3/4 rounded-full" />
        </div>

        {/* Official events footer */}
        <div className="pt-3 border-t border-border">
          <Skeleton mode="pulse" className="h-3 w-24 rounded mb-2" />
          <div className="flex gap-1.5">
            <Skeleton mode="pulse" className="h-6 w-24 rounded-full" />
            <Skeleton mode="pulse" className="h-6 w-28 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
