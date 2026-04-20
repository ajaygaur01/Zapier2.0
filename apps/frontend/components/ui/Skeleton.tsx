"use client";

import { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-neutral-100 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-1">
      {/* Header row */}
      <div className="flex gap-6 border-b border-neutral-100 pb-5 mb-1">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-3.5 flex-1"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-6 py-4 border-b border-neutral-100/80">
          {/* First col: icon + text */}
          <div className="flex items-center gap-3 flex-[2]">
            <Skeleton className="h-9 w-9 rounded-xl flex-shrink-0" />
            <Skeleton className="h-4 flex-1" />
          </div>
          {Array.from({ length: cols - 1 }).map((_, j) => (
            <Skeleton
              key={j}
              className="h-4 flex-1"
              style={{ animationDelay: `${(i * cols + j) * 60}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex gap-3 pt-2">
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
    </div>
  );
}
