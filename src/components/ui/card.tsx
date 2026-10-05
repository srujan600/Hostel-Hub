import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export function Card({
  children,
  className = "",
  hoverEffect = false,
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 shadow-card transition-all duration-200 ${
        hoverEffect ? "hover:shadow-elevated hover:-translate-y-0.5" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`font-heading font-semibold text-slate-900 text-base tracking-tight ${className}`}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = "",
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className="text-xs text-slate-500 font-sans mt-0.5">{children}</p>
  );
}

export function CardContent({
  children,
  className = "",
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = "",
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-5 py-3.5 bg-slate-50/60 rounded-b-xl border-t border-slate-100 flex items-center justify-between gap-3 ${className}`}
    >
      {children}
    </div>
  );
}
