"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id ?? label.replace(/\s+/g, "-").toLowerCase();

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="block text-body-sm font-semibold text-neutral-700 mb-1.5 tracking-tight"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full rounded-xl border bg-neutral-50/50 px-4 py-2.5 text-body text-neutral-900
            placeholder:text-neutral-400/80
            transition-all duration-normal
            focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/25 focus:border-brand-400
            hover:border-neutral-300 hover:bg-white
            disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed
            ${error
              ? "border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-red-400/25"
              : "border-neutral-200"}
            ${className}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-body-sm text-red-500 flex items-center gap-1" role="alert">
            <span className="inline-block w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-caption text-neutral-400 leading-relaxed">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
