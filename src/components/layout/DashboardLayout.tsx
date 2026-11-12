
import { Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Cpu,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/users", label: "Students", icon: Users },
  { to: "/logs", label: "Logs & Analytics", icon: BarChart3 },
  { to: "/settings", label: "System Settings", icon: Settings },
] as const;

export function DashboardLayout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col bg-[#14243A] px-4 py-6 text-white shadow-xl md:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-950/30">
            <Cpu className="size-6" />
          </div>
          <div>
            <p className="text-base font-bold tracking-wide">Attenify</p>
            <p className="mt-0.5 text-xs text-slate-300">
              Attendance Management
            </p>
          </div>
        </div>

        <div className="mt-9 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Main Menu
        </div>

        <nav className="mt-3 flex flex-col gap-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{
                className:
                  "bg-blue-600 text-white shadow-md shadow-blue-950/20",
              }}
              inactiveProps={{
                className:
                  "text-slate-300 hover:bg-white/10 hover:text-white",
              }}
              className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-medium transition-colors"
            >
              <Icon className="size-5 shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
            <span className="size-2 rounded-full bg-blue-400" />
            Attenify System
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Attendance dashboard and student record management.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur md:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-[#14243A] md:text-2xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex items-center gap-3">{actions}</div>
          ) : null}
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{
                className: "bg-blue-600 text-white",
              }}
              inactiveProps={{
                className: "text-slate-600 hover:bg-slate-100",
              }}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>

        <footer className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 md:px-8">
          <Activity className="size-4 text-blue-600" />
          <span>Attenify Attendance Management System</span>
        </footer>
      </div>
    </div>
  );
}
