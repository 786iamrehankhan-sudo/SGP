import { createContext, lazy, Suspense, useContext, useMemo, useState } from "react";
import { Activity, BookOpen, Database, FlaskConical, LayoutDashboard, Map as MapIcon, Satellite, TimerReset, Thermometer } from "lucide-react";
import { cn } from "@/utils/cn";
import { getDataset, type Dataset } from "@/data/engine";
import type { Year } from "@/data/nagpur";
import { MLProvider } from "@/ml/context";
import { MLStatus } from "@/components/ml-ui";
import Overview from "@/views/Overview";
import DataPipeline from "@/views/DataPipeline";
import IndexAnalysis from "@/views/IndexAnalysis";
import TemporalAnalysis from "@/views/TemporalAnalysis";
import ScenarioLab from "@/views/ScenarioLab";

const InteractiveMap = lazy(() => import("@/views/InteractiveMap"));
const Methodology = lazy(() => import("@/views/Methodology"));

export type ViewKey = "overview" | "pipeline" | "indices" | "temporal" | "scenario" | "map" | "methodology";

interface AppState {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  year: Year;
  setYear: (y: Year) => void;
  ds: Dataset;
  scenarioZone: number;
  setScenarioZone: (z: number) => void;
}

const Ctx = createContext<AppState | null>(null);
export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("AppContext missing");
  return c;
};

const NAV: { key: ViewKey; label: string; hint: string; icon: typeof Database; n?: number }[] = [
  { key: "overview", label: "Overview", hint: "Platform summary", icon: LayoutDashboard },
  { key: "pipeline", label: "Data Pipeline", hint: "Collection & preprocessing", icon: Database, n: 1 },
  { key: "indices", label: "Index Analysis", hint: "LST · NDVI · NDBI", icon: Activity, n: 2 },
  { key: "temporal", label: "Temporal & Hotspots", hint: "Change detection", icon: TimerReset, n: 3 },
  { key: "scenario", label: "Scenario Lab", hint: "What-if modelling", icon: FlaskConical, n: 4 },
  { key: "map", label: "Interactive Map", hint: "2D / 3D geospatial UI", icon: MapIcon, n: 5 },
  { key: "methodology", label: "Methodology", hint: "Models · validation · architecture", icon: BookOpen },
];

export default function App() {
  const [view, setView] = useState<ViewKey>("overview");
  const [year, setYear] = useState<Year>(2024);
  const [scenarioZone, setScenarioZone] = useState(8);
  const ds = useMemo(() => getDataset(), []);
  const state: AppState = { view, setView, year, setYear, ds, scenarioZone, setScenarioZone };

  return (
    <Ctx.Provider value={state}>
      <MLProvider ds={ds} year={year}>
        <div className="app-bg flex h-full min-h-screen flex-col lg:flex-row">
          {/* Sidebar */}
          <aside className="flex shrink-0 flex-col border-b border-white/8 bg-slate-950/80 backdrop-blur lg:h-screen lg:w-64 lg:border-b-0 lg:border-r lg:sticky lg:top-0">
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-rose-500 to-fuchsia-600 shadow-lg shadow-orange-900/40">
                <Satellite className="h-5 w-5 text-white" />
                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                  <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-white">Smart Geospatial Platform</p>
                <p className="truncate text-[11px] text-slate-400">Nagpur · Urban Heat Intelligence</p>
              </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = view === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setView(item.key)}
                    className={cn(
                      "group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      active ? "bg-white/10 text-white shadow-inner" : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                    )}
                  >
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold", active ? "border-orange-400/40 bg-orange-500/20 text-orange-200" : "border-white/10 bg-slate-900 text-slate-400 group-hover:text-slate-200")}>
                      {item.n ?? <Icon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-tight">{item.label}</span>
                      <span className="hidden text-[11px] text-slate-500 lg:block">{item.hint}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-auto hidden space-y-2 px-4 py-4 lg:block">
              <div className="rounded-xl border border-white/8 bg-slate-900/60 p-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-2 text-slate-200">
                  <Thermometer className="h-3.5 w-3.5 text-orange-400" />
                  <span className="font-medium">Analysis year</span>
                  <span className="ml-auto rounded-md bg-orange-500/20 px-1.5 py-0.5 font-semibold text-orange-200">{year}</span>
                </div>
                <p className="mt-2 leading-relaxed">Pre-monsoon composites (Mar–May) · Landsat 8/9 + Sentinel-2 · 200 m grid · WGS 84</p>
              </div>
              <MLStatus />
            </div>
          </aside>

          {/* Main */}
          <main className="min-w-0 flex-1">
            <Suspense fallback={<div className="flex h-96 items-center justify-center text-sm text-slate-400">Loading…</div>}>
              {view === "overview" && <Overview />}
              {view === "pipeline" && <DataPipeline />}
              {view === "indices" && <IndexAnalysis />}
              {view === "temporal" && <TemporalAnalysis />}
              {view === "scenario" && <ScenarioLab />}
              {view === "map" && <InteractiveMap />}
              {view === "methodology" && <Methodology />}
            </Suspense>
          </main>
        </div>
      </MLProvider>
    </Ctx.Provider>
  );
}
