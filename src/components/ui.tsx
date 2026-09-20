import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { RAMPS, rampGradient, type LayerKey } from "@/data/colors";
import { YEARS, type Year } from "@/data/nagpur";

export function Card({ title, subtitle, right, children, className, bodyClassName }: {
  title?: ReactNode; subtitle?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-white/8 bg-slate-900/70 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_10px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur", className)}>
      {(title || right) && (
        <header className="flex items-start justify-between gap-3 border-b border-white/6 px-4 py-3">
          <div>
            {title && <h3 className="text-sm font-semibold tracking-tight text-slate-100">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function KPI({ label, value, sub, tone = "neutral", icon }: {
  label: string; value: ReactNode; sub?: ReactNode; tone?: "neutral" | "hot" | "green" | "violet" | "sky" | "amber"; icon?: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "from-slate-800/80 to-slate-900/80 text-slate-100",
    hot: "from-orange-500/15 to-red-600/10 text-orange-200",
    green: "from-emerald-500/15 to-green-600/10 text-emerald-200",
    violet: "from-violet-500/15 to-fuchsia-600/10 text-violet-200",
    sky: "from-sky-500/15 to-cyan-600/10 text-sky-200",
    amber: "from-amber-500/15 to-yellow-600/10 text-amber-200",
  };
  return (
    <div className={cn("rounded-2xl border border-white/8 bg-gradient-to-br p-4", tones[tone])}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
        {icon && <span className="opacity-80">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export function SectionHeader({ n, title, hinglish, why, children }: { n: number; title: string; hinglish: string; why: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 text-sm font-bold text-white shadow-lg shadow-orange-900/40">{n}</span>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h2>
        </div>
        <p className="mt-2 text-sm text-slate-300"><span className="font-semibold text-orange-300">Matlab:</span> {hinglish}</p>
        <p className="mt-1 text-xs text-slate-500"><span className="font-semibold text-slate-400">Why important?</span> {why}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Legend({ layer, className, compact }: { layer: LayerKey; className?: string; compact?: boolean }) {
  const r = RAMPS[layer];
  return (
    <div className={cn("text-[10px] text-slate-300", className)}>
      {!compact && <p className="mb-1 font-medium text-slate-400">{r.label}</p>}
      <div className="h-2 w-full rounded-full" style={{ background: rampGradient(layer) }} />
      <div className="mt-1 flex justify-between tabular-nums">
        {r.ticks.map((t) => (
          <span key={t}>{t}{r.unit}</span>
        ))}
      </div>
    </div>
  );
}

export function Pill({ children, tone = "slate", className }: { children: ReactNode; tone?: "slate" | "green" | "red" | "amber" | "violet" | "sky" | "orange"; className?: string }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-800 text-slate-300 border-white/10",
    green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    red: "bg-red-500/15 text-red-300 border-red-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    sky: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    orange: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", tones[tone], className)}>{children}</span>;
}

export function Segmented<T extends string | number>({ options, value, onChange, size = "sm" }: {
  options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; size?: "sm" | "xs";
}) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-slate-950/60 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg font-medium transition",
            size === "sm" ? "px-3 py-1.5 text-xs" : "px-2 py-1 text-[11px]",
            o.value === value ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-slate-200",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function YearPicker({ value, onChange }: { value: Year; onChange: (y: Year) => void }) {
  return <Segmented options={YEARS.map((y) => ({ value: y, label: y }))} value={value} onChange={onChange} />;
}

export function Slider({ label, value, min, max, step = 1, onChange, format, accent = "#f97316" }: {
  label: ReactNode; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string; accent?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold tabular-nums text-white">{format ? format(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="range-input w-full"
        style={{ background: `linear-gradient(90deg, ${accent} ${pct}%, rgba(255,255,255,0.12) ${pct}%)` }}
      />
    </label>
  );
}

export function Stat({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-white/5 py-1.5 text-xs last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className={cn("font-semibold tabular-nums text-slate-100", tone)}>{value}</span>
    </div>
  );
}

export function Formula({ children }: { children: ReactNode }) {
  return <code className="rounded-md bg-black/40 px-2 py-1 font-mono text-[11px] text-amber-200">{children}</code>;
}

export const chartTheme = {
  grid: "rgba(255,255,255,0.06)",
  axis: "#64748b",
  tooltip: { background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 },
};
