import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "./utils";

type SurfaceCardProps<T extends ElementType> = {
  as?: T;
  padding?: "md" | "lg";
} & Omit<ComponentPropsWithoutRef<T>, "as">;

export function SurfaceCard<T extends ElementType = "div">({
  as,
  className,
  padding = "md",
  ...props
}: SurfaceCardProps<T>) {
  const Component = as ?? "div";
  return (
    <Component
      className={cn(
        "rounded-3xl border border-slate-200 bg-white shadow-sm",
        padding === "lg" ? "p-8" : "p-6",
        className,
      )}
      {...props}
    />
  );
}

interface MetricCardProps {
  label: ReactNode;
  value: ReactNode;
  helper?: ReactNode;
  className?: string;
}

export function MetricCard({ label, value, helper, className }: MetricCardProps) {
  return (
    <SurfaceCard className={cn("p-6", className)}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-4 text-3xl font-semibold text-slate-950">{value}</div>
      {helper ? <div className="mt-2 text-sm text-slate-600">{helper}</div> : null}
    </SurfaceCard>
  );
}
