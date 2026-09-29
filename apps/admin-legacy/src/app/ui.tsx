import type { ButtonHTMLAttributes, ReactNode } from "react";

export function PageHeader({ title, badge }: { title: string; badge?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="font-sans text-2xl font-bold tracking-tight">{title}</h1>
      {badge}
    </div>
  );
}

export function Card({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  return (
    <section
      className={`overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5 ${
        flush ? "" : "p-4"
      }`}
    >
      {children}
    </section>
  );
}

type Tone = "ok" | "warn" | "bad" | "info" | "neutral";

const badgeTones: Record<Tone, string> = {
  ok: "bg-brand-50 text-brand-700 ring-brand-500/20",
  warn: "bg-amber-50 text-amber-800 ring-amber-500/20",
  bad: "bg-red-50 text-red-700 ring-red-500/20",
  info: "bg-sky-50 text-sky-800 ring-sky-500/20",
  neutral: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

type BtnTone = "primary" | "dark" | "warn" | "danger";

const btnTones: Record<BtnTone, string> = {
  primary: "bg-brand-500 hover:bg-brand-600",
  dark: "bg-zinc-700 hover:bg-zinc-800",
  warn: "bg-amber-600 hover:bg-amber-700",
  danger: "bg-red-600 hover:bg-red-700",
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: BtnTone;
}

export function Btn({ tone = "dark", className = "", ...rest }: BtnProps) {
  return (
    <button
      className={`rounded-md px-2.5 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-40 ${btnTones[tone]} ${className}`}
      {...rest}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      {children}
    </label>
  );
}

export const inputCls =
  "rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
