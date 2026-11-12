
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTone = "primary" | "warning" | "destructive" | "info";

const TONES: Record<StatTone, { text: string; bg: string; ring: string }> = {
  primary: {
    text: "text-blue-700",
    bg: "bg-blue-50",
    ring: "ring-blue-100",
  },
  warning: {
    text: "text-amber-700",
    bg: "bg-amber-50",
    ring: "ring-amber-100",
  },
  destructive: {
    text: "text-red-700",
    bg: "bg-red-50",
    ring: "ring-red-100",
  },
  info: {
    text: "text-indigo-700",
    bg: "bg-indigo-50",
    ring: "ring-indigo-100",
  },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  loading,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: StatTone;
  loading?: boolean;
}) {
  const t = TONES[tone];

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>

          <p
            className={cn(
              "mt-3 font-display text-3xl font-bold tracking-tight text-slate-900",
              loading && "opacity-40"
            )}
          >
            {loading ? "—" : value}
          </p>

          {hint ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              {hint}
            </p>
          ) : null}
        </div>

        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-105",
            t.bg,
            t.text,
            t.ring
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}
