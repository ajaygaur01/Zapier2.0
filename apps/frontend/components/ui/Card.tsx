"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  className = "",
  padding = "md",
}: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-neutral-200/80 bg-white shadow-[0_1px_4px_0_rgb(0_0_0_/_0.06),0_0_0_1px_rgb(0_0_0_/_0.03)] transition-all duration-normal hover:shadow-[0_8px_24px_0_rgb(0_0_0_/_0.08),0_0_0_1px_rgb(0_0_0_/_0.04)] hover:-translate-y-px ${paddingMap[padding]} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-title text-neutral-900">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-body-sm text-neutral-500">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
