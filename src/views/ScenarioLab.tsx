import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BrainCircuit, Building2, Leaf, Minus, Plus, RotateCcw, Users } from "lucide-react";
import { useApp } from "@/App";
import RasterCanvas from "@/components/RasterCanvas";
import { Card, Formula, Legend, Pill, SectionHeader, Segmented, Slider, Stat, chartTheme } from "@/components/ui";
import { fmt, runScenario } from "@/data/engine";
import { Method } from "@/components/ml-ui";
import { useML } from "@/ml/context";
import { mlScenario } from "@/ml/pipeline";
import { cn } from "@/utils/cn";

const BUILDING_FOOTPRINT_KM2 = 0.0035; // ~3,500 m² per mid-rise block incl. paved surrounds

const PRESETS = [
  { name: "Miyawaki drive", veg: 20, built: 0, desc: "Dense micro-forests on vacant plots" },
  { name: "Urban forest + de-pave", veg: 30, built: -10, desc: "Canopy + permeable surfaces" },
  { name: "Cool corridor", veg: 15, built: -5, desc: "Avenue trees, shaded streets" },
  { name: "New township", veg: -15, built: 25, desc: "Business-as-usual layout sprawl" },
  { name: "Redevelopment", veg: 5, built: 15, desc: "FSI increase with mandated greens" },
];

export default function ScenarioLab() {
  const { ds, scenarioZone, setScenarioZone } = useApp();
  const ml = useML();
  const [veg, setVeg] = useState(20);
  const [built, setBuilt] = useState(0);
  const [baseline, setBaseline] = useState<"2024" | "2030">("2024");
  const [showDiff, setShowDiff] = useState(false);

  const zone = ds.zones[scenarioZone];
  const result = useMemo(() => runScenario(ds, { zoneIndex: scenarioZone, vegDeltaPct: veg, builtDeltaPct: built, baseline }), [ds, scenarioZone, veg, built, baseline]);
  const reg = ds.regression[2024];

  const buildingsEquivalent = Math.round((built / 100) * zone.areaKm2 / BUILDING_FOOTPRINT_KM2);
  const stepBuildings = (n: number) => {
    const pct = (n * BUILDING_FOOTPRINT_KM2 / zone.areaKm2) * 100;
    setBuilt((b) => Math.max(-30, Math.min(50, +(b + pct).toFixed(1))));
  };

  // ML (non-linear) estimate for the same intervention, using the trained surface model on the 2024 baseline
  const mlEstimate = useMemo(() => (ml.lst && ml.lst.year === 2024 ? mlScenario(ds, ml.lst, scenarioZone, veg, built) : null), [ds, ml.lst, scenarioZone, veg, built]);

  const sensitivity = useMemo(() => {
    const rows = [];
    for (let v = -30; v <= 50; v += 5) {
      const r = runScenario(ds, { zoneIndex: scenarioZone, vegDeltaPct: v, builtDeltaPct: built, baseline });
      const r0 = runScenario(ds, { zoneIndex: scenarioZone, vegDeltaPct: v, builtDeltaPct: 0, baseline });
      const m = ml.lst && ml.lst.year === 2024 && v % 10 === 0 ? mlScenario(ds, ml.lst, scenarioZone, v, built) : null;
      rows.push({ veg: v, combined: +r.dLst.toFixed(2), vegOnly: +r0.dLst.toFixed(2), ml: m ? +m.ml.toFixed(2) : undefined });
    }
    return rows;
  }, [ds, ml.lst, scenarioZone, built, baseline]);

  const diffRaster = useMemo(() => {
    const out = new Float32Array(ds.n);
    for (let i = 0; i < ds.n; i++) out[i] = result.lst[i] - result.baseLst[i];
    return out;
  }, [result, ds.n]);

  const historic = zone.dLst;
  const offsetPct = historic !== 0 ? (-result.dLst / historic) * 100 : 0;
  const cooling = result.dLst < 0;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
      <SectionHeader n={4} title="Scenario Modeling & What-If Tool" hinglish="Interactive tool jahan user hypotheticals explore kar sake." why="Ye planner ko DECISION-MAKING ka power deta hai.">
        <Segmented size="xs" options={[{ value: "2024", label: "Baseline: 2024 observed" }, { value: "2030", label: "Baseline: 2030 BAU projection" }]} value={baseline} onChange={setBaseline} />
      </SectionHeader>

      <div className="grid gap-4 xl:grid-cols-12">
        {/* Controls */}
        <div className="space-y-4 xl:col-span-3">
          <Card title="Target zone" subtitle="Choose from list or click the map">
            <select value={scenarioZone} onChange={(e) => setScenarioZone(Number(e.target.value))} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-400/60">
              {ds.zones.map((z) => <option key={z.zone.id} value={z.index}>{z.zone.name}</option>)}
            </select>
            <p className="mt-2 text-[11px] text-slate-400">{zone.zone.character} · {zone.areaKm2.toFixed(1)} km² · ~{(zone.zone.population / 1000).toFixed(0)}k residents</p>
            <div className="mt-3">
              <Stat label={`LST (${baseline === "2024" ? "2024" : "2030 BAU"})`} value={fmt.temp(result.zoneBefore.lst)} tone="text-orange-300" />
              <Stat label="NDVI" value={result.zoneBefore.ndvi.toFixed(3)} tone="text-emerald-300" />
              <Stat label="NDBI" value={result.zoneBefore.ndbi.toFixed(3)} tone="text-fuchsia-300" />
              <Stat label="Vegetation cover" value={fmt.pct(result.zoneBefore.veg)} />
              <Stat label="Built-up cover" value={fmt.pct(result.zoneBefore.built)} />
              <Stat label="2019→2024 change" value={fmt.delta(zone.dLst, 2, "°C")} />
            </div>
          </Card>

          <Card title="Interventions" subtitle="Percentage points of zone area" right={<button onClick={() => { setVeg(0); setBuilt(0); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" title="Reset"><RotateCcw className="h-4 w-4" /></button>}>
            <div className="space-y-5">
              <Slider label={<span className="flex items-center gap-1.5"><Leaf className="h-3.5 w-3.5 text-emerald-400" /> Vegetation change</span>} value={veg} min={-30} max={50} step={1} onChange={setVeg} format={(v) => `${v > 0 ? "+" : ""}${v}%`} accent="#22c55e" />
              <div className="flex gap-1.5">
                {[10, 20, 30].map((v) => <button key={v} onClick={() => setVeg(v)} className={cn("flex-1 rounded-lg border px-2 py-1 text-[11px]", veg === v ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200" : "border-white/10 text-slate-400 hover:bg-white/5")}>+{v}% green</button>)}
              </div>
              <Slider label={<span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-fuchsia-400" /> Built-up change</span>} value={built} min={-30} max={50} step={1} onChange={setBuilt} format={(v) => `${v > 0 ? "+" : ""}${v}%`} accent="#c084fc" />
              <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Buildings (≈3,500 m² each)</span>
                  <span className={cn("font-semibold tabular-nums", buildingsEquivalent > 0 ? "text-fuchsia-300" : buildingsEquivalent < 0 ? "text-sky-300" : "text-slate-300")}>{buildingsEquivalent > 0 ? "+" : ""}{buildingsEquivalent}</span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  <button onClick={() => stepBuildings(-25)} className="rounded-lg border border-white/10 py-1 text-[11px] text-slate-300 hover:bg-white/5">−25</button>
                  <button onClick={() => stepBuildings(-5)} className="flex items-center justify-center rounded-lg border border-white/10 py-1 text-slate-300 hover:bg-white/5"><Minus className="h-3 w-3" />5</button>
                  <button onClick={() => stepBuildings(5)} className="flex items-center justify-center rounded-lg border border-white/10 py-1 text-slate-300 hover:bg-white/5"><Plus className="h-3 w-3" />5</button>
                  <button onClick={() => stepBuildings(25)} className="rounded-lg border border-white/10 py-1 text-[11px] text-slate-300 hover:bg-white/5">+25</button>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">Negative = demolition / de-paving. “Agar naye 5 buildings aaye toh?” → press +5.</p>
              </div>
            </div>
          </Card>

          <Card title="Presets" subtitle="Combined scenarios">
            <div className="space-y-1.5">
              {PRESETS.map((p) => (
                <button key={p.name} onClick={() => { setVeg(p.veg); setBuilt(p.built); }} className={cn("flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition", veg === p.veg && built === p.built ? "border-orange-400/50 bg-orange-500/10" : "border-white/8 hover:bg-white/5")}>
                  <span><span className="font-medium text-slate-100">{p.name}</span><span className="block text-[10px] text-slate-500">{p.desc}</span></span>
                  <span className="shrink-0 text-right tabular-nums"><span className="text-emerald-300">{p.veg > 0 ? "+" : ""}{p.veg}%</span> <span className="text-slate-600">/</span> <span className="text-fuchsia-300">{p.built > 0 ? "+" : ""}{p.built}%</span></span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Maps */}
        <div className="space-y-4 xl:col-span-6">
          <Card title="Real-time visualisation" subtitle="Change a slider → zone LST re-renders instantly" right={<Segmented size="xs" options={[{ value: 0, label: "Before / After" }, { value: 1, label: "Difference" }]} value={showDiff ? 1 : 0} onChange={(v) => setShowDiff(v === 1)} />}>
            {showDiff ? (
              <div>
                <RasterCanvas values={diffRaster} layer="dlst" showZones highlightZone={scenarioZone} showLabels labelKinds={["city"]} waterColor={null} onClick={(c) => { const z = ds.zoneIndex[c]; if (z >= 0) setScenarioZone(z); }} />
                <Legend layer="dlst" className="mt-3" />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <RasterCanvas values={result.baseLst} layer="lst" showZones highlightZone={scenarioZone} dimOutside={scenarioZone} title={`Before · ${baseline === "2024" ? "2024" : "2030 BAU"}`} onClick={(c) => { const z = ds.zoneIndex[c]; if (z >= 0) setScenarioZone(z); }} />
                </div>
                <div>
                  <RasterCanvas values={result.lst} layer="lst" showZones highlightZone={scenarioZone} dimOutside={scenarioZone} title="After · scenario" onClick={(c) => { const z = ds.zoneIndex[c]; if (z >= 0) setScenarioZone(z); }} />
                </div>
                <Legend layer="lst" className="sm:col-span-2" />
              </div>
            )}
          </Card>

          <Card title="Sensitivity curve" subtitle={`ΔLST in ${zone.zone.short} as vegetation varies · built-up fixed at ${built > 0 ? "+" : ""}${built}%`}>
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={sensitivity} margin={{ left: -10, right: 15, top: 10 }}>
                  <CartesianGrid stroke={chartTheme.grid} />
                  <XAxis dataKey="veg" stroke={chartTheme.axis} fontSize={11} tickLine={false} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`} />
                  <YAxis stroke={chartTheme.axis} fontSize={11} tickLine={false} unit="°C" />
                  <Tooltip contentStyle={chartTheme.tooltip} labelFormatter={(v) => `Vegetation ${Number(v) > 0 ? "+" : ""}${v}%`} formatter={(v) => `${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(2)} °C`} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" />
                  <Line type="monotone" dataKey="vegOnly" name="Vegetation only" stroke="#22c55e" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="combined" name="Combined · linear" stroke="#f97316" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="ml" name="Combined · ML (2024 baseline)" stroke="#e879f9" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  <ReferenceDot x={Math.round(veg / 5) * 5} y={+result.dLst.toFixed(2)} r={6} fill="#fff" stroke="#f97316" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-4 xl:col-span-3">
          <div className={cn("rounded-2xl border p-5", cooling ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-sky-600/5" : result.dLst > 0 ? "border-red-500/30 bg-gradient-to-br from-red-500/15 to-orange-600/5" : "border-white/10 bg-slate-900/70")}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Predicted zone ΔLST</p>
            <p className={cn("mt-1 text-4xl font-bold tabular-nums tracking-tight", cooling ? "text-emerald-200" : result.dLst > 0 ? "text-red-200" : "text-white")}>{fmt.delta(result.dLst, 2, "°C")}</p>
            <p className="mt-1 text-xs text-slate-400">± {result.uncertainty.toFixed(2)} °C (model + composite uncertainty)</p>
            <div className="mt-3 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-fuchsia-200"><BrainCircuit className="h-3.5 w-3.5" /> Non-linear model estimate</span>
                <Method kind="ml" />
              </div>
              {mlEstimate ? (
                <>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-white">{fmt.delta(mlEstimate.ml, 2, "°C")} <span className="text-xs font-normal text-slate-400">· 12-feature linear {fmt.delta(mlEstimate.linear, 2, "°C")}</span></p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{baseline === "2030" ? "Evaluated on the 2024 baseline (the ML model is not extrapolated to 2030). " : ""}{mlEstimate.inRange ? "Intervention stays within the observed feature range." : "Part of the intervention lies outside the observed feature range — the linear estimate is more reliable there."}{Math.abs(mlEstimate.ml) < Math.abs(result.dLst) * 0.8 && veg > 0 ? " Diminishing returns: the learned response saturates at high canopy." : ""}</p>
                </>
              ) : <p className="mt-1 text-[11px] text-slate-400">Training surface model…</p>}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 text-sm">
              <span className="text-slate-400">{fmt.temp(result.zoneBefore.lst)}</span>
              <span className="text-slate-500">→</span>
              <span className={cn("font-semibold", cooling ? "text-emerald-300" : "text-red-300")}>{fmt.temp(result.zoneAfter.lst)}</span>
            </div>
            {result.coverWarning && <p className="mt-3 flex items-start gap-1.5 text-[11px] text-amber-300"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> Vegetation + built-up exceeds available land in parts of the zone — scenario is physically capped.</p>}
          </div>

          <Card title="Combined effect breakdown" subtitle="Contribution of each lever">
            {[
              { label: "Vegetation", v: result.dLstVeg, color: "#22c55e" },
              { label: "Built-up", v: result.dLstBuilt, color: "#c084fc" },
            ].map((b) => (
              <div key={b.label} className="mb-3 text-xs">
                <div className="flex justify-between"><span className="text-slate-300">{b.label}</span><span className="font-semibold tabular-nums text-white">{fmt.delta(b.v, 2, "°C")}</span></div>
                <div className="relative mt-1 h-2 rounded-full bg-white/8">
                  <div className="absolute left-1/2 top-0 h-full w-px bg-white/30" />
                  <div className="absolute top-0 h-full rounded-full" style={{ background: b.color, left: b.v < 0 ? `${50 - Math.min(50, Math.abs(b.v) * 12)}%` : "50%", width: `${Math.min(50, Math.abs(b.v) * 12)}%` }} />
                </div>
              </div>
            ))}
            <Stat label="Zone NDVI" value={<>{result.zoneBefore.ndvi.toFixed(3)} → <span className="text-emerald-300">{result.zoneAfter.ndvi.toFixed(3)}</span></>} />
            <Stat label="Zone NDBI" value={<>{result.zoneBefore.ndbi.toFixed(3)} → <span className="text-fuchsia-300">{result.zoneAfter.ndbi.toFixed(3)}</span></>} />
            <Stat label="Vegetation cover" value={<>{fmt.pct(result.zoneBefore.veg)} → {fmt.pct(result.zoneAfter.veg)}</>} />
            <Stat label="Built-up cover" value={<>{fmt.pct(result.zoneBefore.built)} → {fmt.pct(result.zoneAfter.built)}</>} />
          </Card>

          <Card title="Planning impact" subtitle="What this means for the city">
            <Stat label="City-mean LST effect" value={fmt.delta(result.cityDLst, 3, "°C")} />
            <Stat label="vs 2019→24 warming here" value={<span className={cooling ? "text-emerald-300" : "text-red-300"}>{cooling ? "offsets " : "adds "}{Math.abs(offsetPct).toFixed(0)}%</span>} />
            <Stat label={<span className="flex items-center gap-1"><Users className="h-3 w-3" /> Residents affected</span>} value={`~${(zone.zone.population / 1000).toFixed(0)}k`} />
            <Stat label="Trees needed (est.)" value={veg > 0 ? `~${Math.round((veg / 100) * zone.areaKm2 * 1e6 / 25).toLocaleString()}` : "—"} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {veg >= 20 && <Pill tone="green">Miyawaki-scale</Pill>}
              {built < 0 && <Pill tone="sky">De-paving</Pill>}
              {built > 15 && <Pill tone="red">Heat-risk increase</Pill>}
              {result.dLst < -1 && <Pill tone="green">≥1 °C cooling</Pill>}
            </div>
          </Card>

          <Card title="Model backend" subtitle="Historical relationships from Component 2">
            <Formula>ΔLST = {reg.bNdvi.toFixed(2)}·ΔNDVI + {reg.bNdbi.toFixed(2)}·ΔNDBI</Formula>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">ΔNDVI = 0.72 × Δ(vegetation cover) and ΔNDBI = 0.75 × Δ(built-up cover) from the 2024 land-cover calibration; coefficients are the OLS fit (R² {reg.r2.toFixed(2)}) over {reg.n.toLocaleString()} land pixels. 2030 BAU baseline extrapolates each zone's own 2019–24 trend.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
