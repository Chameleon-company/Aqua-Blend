import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "onDark";
type Size = "md" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-linear-to-r from-primary to-primary-hover text-white hover:brightness-110 disabled:bg-ink-faint disabled:from-ink-faint disabled:to-ink-faint",
  secondary:
    "bg-transparent text-ink border border-border-strong hover:border-ink disabled:text-ink-faint disabled:border-border",
  ghost: "bg-transparent text-primary hover:bg-primary-soft disabled:text-ink-faint",
  danger: "bg-danger text-white hover:opacity-90 disabled:bg-ink-faint",
  onDark: "bg-transparent text-white border border-white/30 hover:border-white hover:bg-white/10",
};

const sizeClasses: Record<Size, string> = {
  md: "px-5 py-2.5 text-sm",
  sm: "px-3 py-1.5 text-xs",
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-medium rounded-sm transition-colors duration-150",
        "disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
