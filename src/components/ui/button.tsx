"use client";

import React, { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "emerald" | "outline" | "destructive" | "subtle" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
      md: "h-10 px-4 text-sm gap-2 rounded-lg",
      lg: "h-11 px-5 text-base gap-2.5 rounded-lg",
    }[size];

    const variantClasses = {
      primary:
        "bg-primary-container hover:bg-primary text-white tactile-btn border border-primary/40",
      emerald:
        "bg-emerald-700 hover:bg-emerald-800 text-white tactile-btn-emerald border border-emerald-900/30",
      outline:
        "bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 tactile-btn-subtle active:translate-y-[1px]",
      destructive:
        "bg-rose-700 hover:bg-rose-800 text-white tactile-btn-danger border border-rose-900/30",
      subtle:
        "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 active:translate-y-[1px]",
      ghost:
        "bg-transparent hover:bg-slate-100 text-slate-700 active:bg-slate-200/80",
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-medium font-heading tracking-tight select-none transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
