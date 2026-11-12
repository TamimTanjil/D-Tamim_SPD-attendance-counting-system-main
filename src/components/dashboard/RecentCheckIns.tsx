
import type { CheckIn } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Clock3, Users } from "lucide-react";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecentCheckIns({
  items,
  loading,
}: {
  items: CheckIn[];
  loading?: boolean;
}) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Clock3 className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Recent Check-ins
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Latest attendance activity
            </p>
          </div>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          <Users className="size-3.5" />
          {items.length} today
        </span>
      </header>

      <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 px-5 py-4"
            >
              <span className="size-10 animate-pulse rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                <div className="h-2.5 w-24 animate-pulse rounded bg-slate-100" />
              </div>
              <span className="h-6 w-12 animate-pulse rounded-full bg-slate-100" />
            </li>
          ))
        ) : items.length === 0 ? (
          <li className="flex flex-col items-center justify-center px-5 py-10 text-center">
            <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Users className="size-5" />
            </span>
            <p className="text-sm font-semibold text-slate-700">
              No check-ins yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Attendance records will appear here.
            </p>
          </li>
        ) : (
          items.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-800 ring-1 ring-blue-100">
                {initials(c.name)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {c.name}
                </p>
                <p className="mt-1 truncate font-mono text-xs text-slate-500">
                  {c.studentId} · {formatTime(c.timestamp)}
                </p>
              </div>

              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-bold ring-1",
                  c.confidence >= 0.9
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                    : c.confidence >= 0.8
                      ? "bg-amber-50 text-amber-700 ring-amber-100"
                      : "bg-red-50 text-red-700 ring-red-100",
                )}
              >
                {(c.confidence * 100).toFixed(0)}%
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
