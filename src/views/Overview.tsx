import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Building2, CloudSun, Flame, Leaf, Network, Satellite, Sparkles, TrendingUp } from "lucide-react";
import { useApp, type ViewKey } from "@/App";
import RasterCanvas from "@/components/RasterCanvas";
import { Card, KPI, Legend, Pill, YearPicker, chartTheme } from "@/components/ui";
import { Method, MLPending } from "@/components/ml-ui";
import { useML } from "@/ml/context";
import { CELL_AREA_KM2, YEARS } from "@/data/nagpur";
import { fmt } from "@/data/engine";
import { getYearQuality } from "@/data/catalog";

const COMPONENTS: { n: number; key: ViewKey; title: string; matlab: string; points: string[]; accent: string }[] = [
  { n: 1, key: "pipeline", title: "Data Collection & Preprocessing", matlab: "Raw satellite data ko usable form mein laana", points: ["Landsat 8/9 + Sentinel-2 fetch", "Cloud masking & cleaning", "Georeferencing (UTM 44N)", "Time-series stack 2019–24"], accent: "from-sky-500/20 to-cyan-600/5" },
  { n: 2, key: "indices", title: "Geospatial Analysis & Index Calculation", matlab: "Raw data se meaningful information extract karna", points: ["LST thermal mapping", "NDVI vegetation index", "NDBI built-up index", "Cross-correlation LST↔NDVI↔NDBI"], accent: "from-emerald-500/20 to-green-600/5" },
  { n: 3, key: "temporal", title: "Temporal Analysis & Hotspot Detection", matlab: "Time ke saath kya change hua, persistent problems kaunse hain", points: ["2019 vs 2024 swipe compare", "Change detection maps", "Persistent hotspot ID", "Rate of change + extrapolation"], accent: "from-orange-500/20 to-red-600/5" },
  { n: 4, key: "scenario", title: "Scenario Modeling & What-If Tool", matlab: "Interactive tool jahan user hypotheticals explore kar sake", points: ["Vegetation +10/20/30% sliders", "Add / demolish buildings", "Combined scenarios", "Real-time map update"], accent: "from-violet-500/20 to-fuchsia-600/5" },
  { n: 5, key: "map", title: "Interactive Geospatial Interface", matlab: "Sab chiz ko user-friendly format mein present karna", points: ["Toggleable LST/NDVI/NDBI layers", "Timeline slider 2019→2024", "Zone A vs Zone B compare", "Data quality indicators + 3D view"], accent: "from-amber-500/20 to-yellow-600/5" },
];

export default function Overview() {
  const { ds, year, setYear, setView } = useApp();
  const ml = useML();
  const c24 = ds.city[2024];
  const c19 = ds.city[2019];
  const reg = ds.regression[2024];
  const quality = useMemo(() => getYearQuality(), []);

  const persistentKm2 = useMemo(() => {
    let k = 0;
    for (let i = 0; i < ds.n; i++) if (ds.hotCount[i] >= 5) k++;
    return k * CELL_AREA_KM2;
  }, [ds]);

  const fastest = [...ds.zones].sort((a, b) => b.dLst - a.dLst)[0];
  const hottest = [...ds.zones].sort((a, b) => b.byYear[year].lst - a.byYear[year].lst)[0];
  const coolest = [...ds.zones].sort((a, b) => a.byYear[year].lst - b.byYear[year].lst)[0];
  const persistentZones = [...ds.zones].sort((a, b) => b.persistentFrac - a.persistentFrac).slice(0, 3);

  const trendData = useMemo(() => {
    const rows: { year: number; lst?: number; fit: number; proj?: number }[] = [];
    for (let y = 2019; y <= 2030; y++) {
      const fit = ds.trends.lst.intercept + ds.trends.lst.slope * y;
      rows.push({ year: y, lst: y <= 2024 ? ds.city[y as 2019].lstMean : undefined, fit, proj: y >= 2024 ? fit : undefined });
    }
    return rows;
  }, [ds]);

  const findings = [
    { icon: Flame, text: <>City-mean surface temperature rose <b className="text-orange-300">{fmt.delta(c24.lstMean - c19.lstMean, 2, "°C")}</b> between 2019 and 2024 (trend {fmt.delta(ds.trends.lst.slope, 2, " °C/yr")}, R² {ds.trends.lst.r2.toFixed(2)}).</> },
    { icon: Building2, text: <>Fastest-warming zone: <b className="text-white">{fastest.zone.name}</b> at <b className="text-orange-300">{fmt.delta(fastest.dLst, 1, "°C")}</b>, driven by NDVI {fmt.delta(fastest.dNdvi, 2)} and NDBI {fmt.delta(fastest.dNdbi, 2)}.</> },
    { icon: Sparkles, text: <><b className="text-red-300">{persistentKm2.toFixed(1)} km²</b> stayed in the hottest 10% in ≥5 of 6 years — priority zones: {persistentZones.map((z) => z.zone.short).join(", ")}.</> },
    { icon: Leaf, text: <>Strong inverse coupling: r(NDVI, LST) = <b className="text-emerald-300">{reg.rNdviLst.toFixed(2)}</b>; each +0.1 NDVI ≈ <b className="text-emerald-300">{(reg.bNdvi * 0.1).toFixed(2)} °C</b>, each +0.1 NDBI ≈ <b className="text-fuchsia-300">+{(reg.bNdbi * 0.1).toFixed(2)} °C</b>.</> },
    { icon: CloudSun, text: <>Green cover (NDVI &gt; 0.4) fell from {c19.greenAreaKm2.toFixed(0)} to {c24.greenAreaKm2.toFixed(0)} km²; built-up (NDBI &gt; 0.1) grew from {c19.builtAreaKm2.toFixed(0)} to {c24.builtAreaKm2.toFixed(0)} km².</> },
    ...(ml.islands ? [{ icon: Network, text: <>Density clustering resolves the hotspot mask into <b className="text-white">{ml.islands.islands.length} contiguous heat islands</b>; the largest — <b className="text-orange-300">{ml.islands.islands[0].name}</b> — spans {ml.islands.islands[0].areaKm2.toFixed(1)} km² with a mean of {fmt.temp(ml.islands.islands[0].meanLst)}. <Method kind="ml" className="ml-1 align-middle" /></> }] : []),
    ...(ml.forecast ? [{ icon: TrendingUp, text: <>Under current land-cover trajectories the 2030 outlook puts the city mean at <b className="text-rose-300">{fmt.temp(ml.forecast.stats.meanTarget)}</b> and the area above 42 °C at <b className="text-rose-300">{ml.forecast.stats.hotTarget.toFixed(0)} km²</b> (back-test pattern RMSE {ml.forecast.backtest[0].patternRmse.toFixed(2)} °C). <Method kind="ml" className="ml-1 align-middle" /></> }] : []),
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/40 p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap gap-2">
              <Pill tone="orange"><Satellite className="h-3 w-3" /> Landsat 8 / 9</Pill>
              <Pill tone="sky"><Satellite className="h-3 w-3" /> Sentinel-2 A / B</Pill>
              <Pill tone="slate">2019 → 2024 · pre-monsoon</Pill>
              <Pill tone="slate">200 m grid · {ds.n.toLocaleString()} cells</Pill>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">Smart Geospatial Platform for Nagpur</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
              Urban Heat Island intelligence for India's hottest metro — satellite-derived <span className="text-orange-300">LST</span>, <span className="text-emerald-300">NDVI</span> and <span className="text-fuchsia-300">NDBI</span> stacked over six years, analysed for hotspots, trends and what-if planning scenarios.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <YearPicker value={year} onChange={setYear} />
            <button onClick={() => setView("map")} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-orange-100">
              Open interactive map <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KPI label={`Mean LST ${year}`} value={fmt.temp(ds.city[year].lstMean)} sub={`${fmt.delta(ds.city[year].lstMean - c19.lstMean, 2, "°C")} vs 2019`} tone="hot" icon={<Flame className="h-4 w-4 text-orange-400" />} />
        <KPI label={`Mean NDVI ${year}`} value={ds.city[year].ndviMean.toFixed(3)} sub={`${fmt.delta(ds.city[year].ndviMean - c19.ndviMean, 3)} vs 2019`} tone="green" icon={<Leaf className="h-4 w-4 text-emerald-400" />} />
        <KPI label={`Mean NDBI ${year}`} value={ds.city[year].ndbiMean.toFixed(3)} sub={`${fmt.delta(ds.city[year].ndbiMean - c19.ndbiMean, 3)} vs 2019`} tone="violet" icon={<Building2 className="h-4 w-4 text-fuchsia-400" />} />
        <KPI label="Persistent hotspots" value={`${persistentKm2.toFixed(1)} km²`} sub="Top-10% LST in ≥5 of 6 years" tone="amber" />
        <KPI label="LST model skill (held-out)" value={ml.lst ? `R² ${ml.lst.best.test.r2.toFixed(2)}` : "training…"} sub={ml.lst ? `${ml.lst.best.name} · RMSE ${ml.lst.best.test.rmse.toFixed(2)}°C · OLS ${reg.r2.toFixed(2)}` : `OLS baseline R² ${reg.r2.toFixed(2)}`} tone="sky" icon={<Method kind="ml" />} />
        <KPI label="Data quality" value={quality.find((q) => q.year === year)?.quality ?? "—"} sub={`${quality.find((q) => q.year === year)?.used ?? 0} clear scenes · ${quality.find((q) => q.year === year)?.completeness.toFixed(1)}% coverage`} tone="neutral" />
      </div>

      {/* Map + trend */}
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3" title={`Land Surface Temperature · ${year}`} subtitle="Pre-monsoon composite · Landsat TIRS band 10, emissivity-corrected" right={<Pill tone="orange">Hottest: {hottest.zone.short} {fmt.temp(hottest.byYear[year].lst)}</Pill>}>
          <RasterCanvas values={ds.rasters[year].lst} layer="lst" showLabels showZones={false} />
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <Legend layer="lst" />
            <div className="text-xs text-slate-400">Coolest zone: <span className="font-semibold text-sky-300">{coolest.zone.short}</span> {fmt.temp(coolest.byYear[year].lst)}</div>
          </div>
        </Card>
        <div className="space-y-4 xl:col-span-2">
          <Card title="City-wide LST trajectory" subtitle="Observed 2019–2024 with linear extrapolation to 2030">
            <div className="h-52">
              <ResponsiveContainer>
                <ComposedChart data={trendData} margin={{ left: -10, right: 10, top: 10 }}>
                  <defs>
                    <linearGradient id="lstFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="year" stroke={chartTheme.axis} fontSize={11} tickLine={false} />
                  <YAxis stroke={chartTheme.axis} fontSize={11} tickLine={false} domain={["dataMin - 0.5", "dataMax + 0.5"]} tickFormatter={(v) => v.toFixed(1)} />
                  <Tooltip contentStyle={chartTheme.tooltip} formatter={(v) => `${Number(v).toFixed(2)} °C`} />
                  <Area type="monotone" dataKey="lst" stroke="#f97316" fill="url(#lstFill)" strokeWidth={2} name="Observed" connectNulls={false} />
                  <Line type="linear" dataKey="proj" stroke="#fb7185" strokeDasharray="5 5" dot={false} name="Projection" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span>Linear trend → 2030 ≈ <span className="font-semibold text-rose-300">{fmt.temp(ds.trends.lst.intercept + ds.trends.lst.slope * 2030)}</span></span>
              {ml.forecast && <span>· spatial ML outlook <span className="font-semibold text-rose-300">{fmt.temp(ml.forecast.stats.meanTarget)}</span> ±{ml.forecast.stats.sigma.toFixed(1)} <Method kind="ml" className="align-middle" /></span>}
            </div>
          </Card>
          <Card title="Priority heat islands" subtitle="Contiguous islands from density clustering of persistent hotspots (DBSCAN)" right={<Method kind="ml" />}>
            {ml.islands ? (
              <div className="space-y-1.5">
                {ml.islands.islands.slice(0, 5).map((isl, k) => (
                  <button key={isl.id} onClick={() => setView("temporal")} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white/5">
                    <span className="flex items-center gap-2 text-slate-200"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: ml.islands!.palette[(isl.id % (ml.islands!.palette.length - 1)) + 1] }} /><span className="text-slate-500">#{k + 1}</span>{isl.name}</span>
                    <span className="tabular-nums text-slate-400">{isl.areaKm2.toFixed(1)} km² · <span className="font-semibold text-orange-300">{fmt.temp(isl.meanLst)}</span></span>
                  </button>
                ))}
              </div>
            ) : <MLPending stage="islands" height={150} />}
          </Card>
          <Card title="Key findings" subtitle="Auto-generated from the analysis stack">
            <ul className="space-y-2.5">
              {findings.map((f, i) => (
                <li key={i} className="flex gap-3 text-xs leading-relaxed text-slate-300">
                  <f.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Components */}
      <div>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Platform components</h2>
            <p className="text-xs text-slate-400">Paanch modules — data se decision tak ka poora pipeline.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {COMPONENTS.map((c) => (
            <button key={c.key} onClick={() => setView(c.key)} className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${c.accent} p-4 text-left transition hover:border-white/25 hover:bg-white/5`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Component {c.n}</span>
                <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
              </div>
              <h3 className="mt-2 text-sm font-semibold leading-snug text-white">{c.title}</h3>
              <p className="mt-1 text-[11px] italic text-slate-400">{c.matlab}</p>
              <ul className="mt-3 space-y-1">
                {c.points.map((p) => (
                  <li key={p} className="flex items-center gap-1.5 text-[11px] text-slate-300"><span className="h-1 w-1 rounded-full bg-orange-400" />{p}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Year composites: {YEARS.join(" · ")}. Rasters here are model-generated demonstrations calibrated to Nagpur's geography; plug the same pipeline into USGS/Copernicus feeds for operational use.
      </p>
    </div>
  );
}
