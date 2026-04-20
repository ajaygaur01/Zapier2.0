"use client";

import { ReactNode } from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

const defaultIcon = (
  <svg
    className="w-7 h-7 text-brand-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);

export function EmptyState({
  icon = defaultIcon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-neutral-200 bg-gradient-to-b from-neutral-50/80 to-white py-20 px-8 text-center ${className}`}
    >
      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgb(99 102 241 / 0.12), transparent)",
        }}
      />

      {/* Icon container */}
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-100 bg-gradient-to-b from-brand-50 to-white shadow-soft">
        {icon}
      </div>

      <h3 className="text-title font-bold text-neutral-900 mb-2">{title}</h3>
      {description && (
        <p className="text-body text-neutral-500 max-w-sm mb-8 leading-relaxed">{description}</p>
      )}
      {action && (
        <Button variant="primary" size="md" onClick={action.onClick}>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {action.label}
        </Button>
      )}
    </div>
  );
}
