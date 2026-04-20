"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";

const base =
  "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95 select-none";

const sizeStyles = {
  sm: "text-body-sm px-3.5 py-1.5 gap-1.5",
  md: "text-body px-4.5 py-2.5 gap-2",
  lg: "text-title-sm px-7 py-3.5 gap-2.5",
};

const variantStyles = {
  primary:
    "bg-gradient-to-b from-brand-500 to-brand-600 text-white hover:from-brand-600 hover:to-brand-700 shadow-[0_1px_3px_0_rgb(99_102_241_/_0.4),0_0_0_1px_rgb(99_102_241_/_0.2)] hover:shadow-[0_4px_12px_0_rgb(99_102_241_/_0.4),0_0_0_1px_rgb(99_102_241_/_0.3)]",
  secondary:
    "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 active:bg-neutral-100 shadow-soft hover:shadow-soft-md",
  ghost:
    "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200",
  danger:
    "bg-gradient-to-b from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-[0_1px_3px_0_rgb(239_68_68_/_0.4)]",
  ghostDanger:
    "text-red-600 hover:bg-red-50 hover:text-red-700 active:bg-red-100",
};

type Variant = keyof typeof variantStyles;
type Size = keyof typeof sizeStyles;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
  asChild?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`${base} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  size = "md",
  className = "",
  disabled,
  type,
}: {
  children: ReactNode;
  onClick?: () => void;
  size?: Size;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <Button
      variant="primary"
      size={size}
      onClick={onClick}
      className={className}
      disabled={disabled}
      type={type ?? "button"}
    >
      {children}
    </Button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  size = "md",
  className = "",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  size?: Size;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="secondary"
      size={size}
      onClick={onClick}
      className={className}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

export function GhostButton({
  children,
  onClick,
  size = "md",
  className = "",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  size?: Size;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size={size}
      onClick={onClick}
      className={className}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

export function DangerButton({
  children,
  onClick,
  size = "md",
  className = "",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  size?: Size;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="danger"
      size={size}
      onClick={onClick}
      className={className}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
