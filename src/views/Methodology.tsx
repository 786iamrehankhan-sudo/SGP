import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend as RLegend, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { ArrowRight, BookOpen, Boxes, BrainCircuit, CheckCircle2, Cloud, Cpu, Database, FileCode, GitBranch, Layers, Network, Satellite, Server, ShieldCheck, Terminal, TrendingUp } from "lucide-react";
import { useApp } from "@/App";
import CodeBlock from "@/components/CodeBlock";
import { Method, MLPending } from "@/components/ml-ui";
import RasterCanvas from "@/components/RasterCanvas";
import { Card, Legend, Pill, Segmented, chartTheme } from "@/components/ui";
import { rampCss } from "@/data/colors";
import { useML } from "@/ml/context";
import { cn } from "@/utils/cn";

import configSrc from "../../python/nagpur_uhi/config.py?raw";
import fetchSrc from "../../python/nagpur_uhi/fetch.py?raw";
import preprocessSrc from "../../python/nagpur_uhi/preprocess.py?raw";
import indicesSrc from "../../python/nagpur_uhi/indices.py?raw";
import temporalSrc from "../../python/nagpur_uhi/temporal.py?raw";
import zonesSrc from "../../python/nagpur_uhi/zones.py?raw";
import scenarioSrc from "../../python/nagpur_uhi/scenario.py?raw";
import mlSrc from "../../python/nagpur_uhi/ml.py?raw";
import exportSrc from "../../python/nagpur_uhi/export.py?raw";
import apiSrc from "../../python/nagpur_uhi/api.py?raw";
import cliSrc from "../../python/nagpur_uhi/cli.py?raw";
import testsSrc from "../../python/tests/test_pipeline.py?raw";
import testsMlSrc from "../../python/tests/test_ml.py?raw";
import reportTxt from "@/data/python_report.txt?raw";
import mlTxt from "@/data/python_ml.txt?raw";

const MODEL_COLORS: Record<string, string> = { linear: "#94a3b8", rf: "#22c55e", gbm: "#f97316" };

// ------------------------------------------------------------------ architecture
const ARCH = [
  { icon: Satellite, title: "Acquisition", tech: "Landsat 8/9 C2-L2 · Sentinel-2 L2A", detail: "STAC search on Microsoft Planetary Computer (or Google Earth Engine); AOI windows streamed from Cloud-Optimised GeoTIFFs.", py: "fetch.py" },
  { icon: Cloud, title: "Preprocessing", tech: "QA_PIXEL / SCL masks · UTM 44N → WGS 84", detail: "Cloud, shadow and cirrus masking with 1-px dilation; scale factors; co-registration; per-season median composites with observation counts.", py: "preprocess.py" },
  { icon: Layers, title: "Index engine", tech: "LST · NDVI · NDBI", detail: "Emissivity-corrected surface temperature (Collection-2 ST or single-channel chain), spectral indices, zonal statistics, OLS baseline.", py: "indices.py · zones.py" },
  { icon: BrainCircuit, title: "Learning layer", tech: "Gradient boosting · random forest · k-means · DBSCAN", detail: "Non-linear LST model with spatial cross-validation, land-cover clustering, heat-island segmentation, anomaly detection, hybrid forecast.", py: "ml.py" },
  { icon: Server, title: "Serving", tech: "FastAPI · JSON / PNG / GeoTIFF", detail: "REST API and static analysis bundle consumed by this interface; GeoTIFF exports for QGIS / ArcGIS.", py: "api.py · export.py" },
];

// ------------------------------------------------------------------ model cards
interface ModelCard { icon: typeof Boxes; name: string; role: string; algo: string; features: string; validation: string; usedIn: string[]; caveat: string }
const MODEL_CARDS: ModelCard[] = [
  { icon: GitBranch, name: "LST surface model", role: "Explains and predicts surface temperature from land cover and context", algo: "Gradient boosting (200 rounds, depth 4) vs random forest (60 trees) vs OLS; 64-bin histogram trees", features: "NDVI, NDBI, 1 km NDVI/NDBI means, NDBI texture, water share, distance to water / centre / major road, industrial proximity, position", validation: "Spatial block hold-out (2 km blocks, 22 %) — random splits overstate skill under spatial autocorrelation. Permutation importance and partial dependence on held-out blocks.", usedIn: ["Index Analysis · model comparison & drivers", "Scenario Lab · non-linear what-if", "Overview · model skill KPI"], caveat: "Tree ensembles do not extrapolate beyond the observed feature range; the linear model is used for out-of-range scenarios." },
  { icon: Network, name: "Heat-island segmentation", role: "Turns per-pixel hotspot flags into named, contiguous heat islands", algo: "DBSCAN (ε = 1.5 cells ≈ 300 m, minPts = 4) on cells in the hottest decile in ≥ 4 of 6 years", features: "Grid position of persistent-hotspot cells", validation: "Density-based — no k to choose; isolated cells are rejected as noise. Islands are ranked by area and enriched with 2024 statistics and resident estimates.", usedIn: ["Temporal & Hotspots · island catalogue", "Overview · priority islands"], caveat: "ε is resolution-dependent; re-tune when moving from 200 m to 30 m grids." },
  { icon: Boxes, name: "Land-cover clustering", role: "Unsupervised land-cover classes and the 2019 → 2024 transition matrix", algo: "k-means (k = 5, k-means++ seeding) on 2019 + 2024 pooled; water fixed from the QA mask", features: "NDVI, NDBI and their 1 km means (z-scored)", validation: "Elbow curve (k = 2…8); one shared centroid set so both years are directly comparable; classes auto-labelled by NDBI − NDVI ordering.", usedIn: ["Temporal & Hotspots · land-cover transitions"], caveat: "Spectral classes, not cadastral land use; mixed pixels at 200 m blur class boundaries." },
  { icon: TrendingUp, name: "2030 outlook", role: "Spatially explicit LST projection under current land-cover trajectories", algo: "Hybrid: GBM learns the spatial anomaly LST − cityMean(year) on all six years; city mean extrapolated linearly; NDVI/NDBI projected per pixel", features: "Same 12 features with projected NDVI / NDBI", validation: "Back-test — trained on 2019–2023, forecasts 2024 blind; compared with per-pixel linear trend and persistence baselines on RMSE, bias and bias-free pattern RMSE.", usedIn: ["Temporal & Hotspots · outlook", "Overview · 2030 KPI"], caveat: "Business-as-usual scenario, not a weather forecast; the ±1σ band reflects season-to-season variability only." },
];

// ------------------------------------------------------------------ python modules
const PY = [
  { file: "config.py", src: configSrc, title: "Configuration", desc: "AOI, seasons, QA thresholds, scale factors, zones" },
  { file: "fetch.py", src: fetchSrc, title: "Acquisition", desc: "Planetary Computer STAC + Earth Engine back-ends" },
  { file: "preprocess.py", src: preprocessSrc, title: "Preprocessing", desc: "Masks, reprojection, compositing, quality report" },
  { file: "indices.py", src: indicesSrc, title: "Indices", desc: "LST / NDVI / NDBI, statistics, OLS" },
  { file: "temporal.py", src: temporalSrc, title: "Temporal", desc: "Change detection, persistence, Gi*, trends" },
  { file: "zones.py", src: zonesSrc, title: "Zones", desc: "Zonal statistics, comparison, GeoJSON" },
  { file: "scenario.py", src: scenarioSrc, title: "Scenario", desc: "What-if model, presets, 2030 BAU baseline" },
  { file: "ml.py", src: mlSrc, title: "Machine learning", desc: "scikit-learn models, spatial CV, clustering, forecast" },
  { file: "export.py", src: exportSrc, title: "Export", desc: "JSON bundle, PNG maps, GeoTIFF" },
  { file: "api.py", src: apiSrc, title: "API", desc: "FastAPI endpoints for the interface" },
  { file: "cli.py", src: cliSrc, title: "CLI", desc: "fetch · build · analyze · ml · scenario · serve" },
  { file: "tests/test_pipeline.py", src: testsSrc, title: "Tests · pipeline", desc: "Index maths, masks, compositing, end-to-end" },
  { file: "tests/test_ml.py", src: testsMlSrc, title: "Tests · ML", desc: "CV sanity, clusters, forecast, what-if" },
];

const RUNBOOK = `# reproduce this analysis
cd python && pip install -r requirements.txt

python -m nagpur_uhi fetch   --source pc --years 2019 2024   # Landsat 8/9 + Sentinel-2 via Planetary Computer
python -m nagpur_uhi build   --source raw                     # masks → indices → 200 m grid → seasonal medians
python -m nagpur_uhi analyze --png --geotiff                  # statistics, trends, hotspots, zones → JSON / PNG / GeoTIFF
python -m nagpur_uhi ml      --year 2024 --forecast 2030      # spatial-CV models, clustering, islands, forecast
python -m nagpur_uhi serve   --port 8000                      # REST API for this interface

# no network / GDAL? run the calibrated offline cube
python -m nagpur_uhi run-all --source demo && python -m nagpur_uhi ml`;

// ================================================================== live validation panel
function LiveValidation() {
  const ml = useML();
  const r = ml.lst;
  if (!r) return <MLPending stage="lst" height={300} />;
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card title="Held-out skill by model" subtitle={`Analysis year ${r.year} · ${r.split.nTest.toLocaleString()} test cells in ${r.split.nTestBlocks} spatial blocks`} right={<Method kind="cv" />}>
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="pb-2 text-left font-medium">Model</th><th className="pb-2 text-right font-medium">R²</th><th className="pb-2 text-right font-medium">RMSE</th><th className="pb-2 text-right font-medium">MAE</th><th className="pb-2 text-right font-medium">Train R²</th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {r.models.map((m) => (
              <tr key={m.name} className={cn(m.name === r.best.name && "bg-white/4")}>
                <td className="py-1.5 text-slate-100"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: MODEL_COLORS[m.kind] }} />{m.name}{m.name === r.best.name && <Pill tone="orange" className="ml-2">selected</Pill>}</td>
                <td className="py-1.5 text-right tabular-nums text-white">{m.test.r2.toFixed(3)}</td>
                <td className="py-1.5 text-right tabular-nums text-white">{m.test.rmse.toFixed(2)}°</td>
                <td className="py-1.5 text-right tabular-nums text-slate-300">{m.test.mae.toFixed(2)}°</td>
                <td className="py-1.5 text-right tabular-nums text-slate-400">{m.train.r2.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">Model selection is automatic (lowest held-out RMSE). The small train–test gap indicates limited over-fitting; the remaining ~0.9 °C is composite/sensor noise.</p>
      </Card>
      <Card title="Predicted vs observed" subtitle={`${r.best.name} on held-out blocks`}>
        <div className="h-60">
          <ResponsiveContainer>
            <ScatterChart margin={{ left: -10, right: 10, top: 10 }}>
              <CartesianGrid stroke={chartTheme.grid} />
              <XAxis type="number" dataKey="obs" name="Observed" unit="°" domain={[30, 50]} stroke={chartTheme.axis} fontSize={11} tickLine={false} />
              <YAxis type="number" dataKey="pred" name="Predicted" unit="°" domain={[30, 50]} stroke={chartTheme.axis} fontSize={11} tickLine={false} />
              <ZAxis range={[12, 12]} />
              <Tooltip contentStyle={chartTheme.tooltip} formatter={(v) => `${Number(v).toFixed(2)} °C`} cursor={{ strokeDasharray: "3 3" }} />
              <ReferenceLine segment={[{ x: 30, y: 30 }, { x: 50, y: 50 }]} stroke="#fff" strokeDasharray="5 4" />
              <Scatter data={r.scatter} isAnimationActive={false}>{r.scatter.map((p, i) => <Cell key={i} fill={rampCss("lst", p.obs)} fillOpacity={0.65} />)}</Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Feature importance" subtitle="Permutation ΔRMSE on held-out blocks">
        <div className="h-60">
          <ResponsiveContainer>
            <BarChart data={r.permutation.slice(0, 8)} layout="vertical" margin={{ left: 40, right: 20 }}>
              <CartesianGrid stroke={chartTheme.grid} horizontal={false} />
              <XAxis type="number" stroke={chartTheme.axis} fontSize={10} tickLine={false} unit="°" />
              <YAxis type="category" dataKey="label" stroke={chartTheme.axis} fontSize={10} tickLine={false} width={120} />
              <Tooltip contentStyle={chartTheme.tooltip} formatter={(v) => `+${Number(v).toFixed(3)} °C RMSE`} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>{r.permutation.slice(0, 8).map((p) => <Cell key={p.key} fill={p.group === "spectral" ? "#f97316" : p.group === "context" ? "#38bdf8" : p.group === "geography" ? "#a78bfa" : "#64748b"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      {(["ndvi", "ndbi"] as const).map((k) => (
        <Card key={k} title={`Response curve · ${k.toUpperCase()}`} subtitle="Partial dependence — average prediction as one feature is varied">
          <div className="h-52">
            <ResponsiveContainer>
              <LineChart data={r.pd[k]} margin={{ left: -10, right: 10, top: 10 }}>
                <CartesianGrid stroke={chartTheme.grid} />
                <XAxis dataKey="x" stroke={chartTheme.axis} fontSize={11} tickLine={false} />
                <YAxis stroke={chartTheme.axis} fontSize={11} tickLine={false} domain={["auto", "auto"]} unit="°" tickFormatter={(v) => Number(v).toFixed(0)} />
                <Tooltip contentStyle={chartTheme.tooltip} formatter={(v) => `${Number(v).toFixed(2)} °C`} />
                <RLegend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="linear" name="Linear" stroke={MODEL_COLORS.linear} strokeWidth={2} dot={false} strokeDasharray="5 4" />
                <Line type="monotone" dataKey="rf" name="Random forest" stroke={MODEL_COLORS.rf} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="gbm" name="Gradient boosting" stroke={MODEL_COLORS.gbm} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{k === "ndvi" ? "Canopy cooling saturates — the first increment of greenness buys the most cooling." : "Impervious heating steepens beyond NDBI ≈ 0.15 — a threshold the linear baseline cannot represent."}</p>
        </Card>
      ))}
      <Card title="Residual map" subtitle="Observed − predicted · positive = hotter than land cover explains">
        <RasterCanvas values={r.residual} layer="dlst" showLabels labelKinds={["industry", "transport"]} />
        <Legend layer="dlst" className="mt-3" />
      </Card>
    </div>
  );
}

function ForecastValidation() {
  const ml = useML();
  const fc = ml.forecast;
  if (!fc) return <MLPending stage="forecast" height={160} />;
  return (
    <Card title="Outlook back-test · forecast 2024 from 2019–2023" subtitle="The model never saw 2024. Pattern RMSE removes the common seasonal bias and isolates spatial skill." right={<Method kind="cv" />}>
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="pb-2 text-left font-medium">Method</th><th className="pb-2 text-right font-medium">RMSE</th><th className="pb-2 text-right font-medium">Bias</th><th className="pb-2 text-right font-medium">Pattern RMSE</th><th className="pb-2 text-right font-medium">R²</th></tr></thead>
        <tbody className="divide-y divide-white/5">
          {fc.backtest.map((b, i) => (
            <tr key={b.name} className={cn(i === 0 && "bg-white/4")}><td className="py-1.5 text-slate-100">{b.name}{i === 0 && <Pill tone="orange" className="ml-2">selected</Pill>}</td><td className="py-1.5 text-right tabular-nums text-white">{b.rmse.toFixed(2)}°</td><td className="py-1.5 text-right tabular-nums text-slate-300">{b.bias > 0 ? "+" : ""}{b.bias.toFixed(2)}°</td><td className="py-1.5 text-right tabular-nums text-emerald-300">{b.patternRmse.toFixed(2)}°</td><td className="py-1.5 text-right tabular-nums text-slate-300">{b.r2.toFixed(2)}</td></tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ================================================================== page
type Section = "architecture" | "models" | "validation";

export default function Methodology() {
  const { setView } = useApp();
  const [section, setSection] = useState<Section>("architecture");
  const [pyFile, setPyFile] = useState(PY[7]);
  const [pyTab, setPyTab] = useState<"source" | "runbook" | "output">("runbook");

  const body: Record<Section, ReactNode> = {
    architecture: (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          {ARCH.map((a, i) => (
            <div key={a.title} className="relative rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-slate-200"><a.icon className="h-4 w-4" /></span><div><p className="text-[10px] uppercase tracking-widest text-slate-500">Stage {i + 1}</p><h3 className="text-sm font-semibold text-white">{a.title}</h3></div></div>
              <p className="mt-2 text-[11px] font-medium text-sky-200">{a.tech}</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{a.detail}</p>
              <p className="mt-2 font-mono text-[10px] text-slate-500">{a.py}</p>
              {i < ARCH.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-slate-600 md:block" />}
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Two runtimes, one method" subtitle="Where each computation happens">
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex gap-3 rounded-xl bg-white/3 p-3"><Cpu className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" /><div><p className="font-semibold text-white">Browser runtime (this interface)</p><p className="mt-0.5 text-slate-400">Dependency-free TypeScript implementation of the same models — histogram-based boosting, random forest, k-means, DBSCAN — trained on the 200 m analysis cube when the page opens. Enables interactive what-if without a server round-trip.</p></div></div>
              <div className="flex gap-3 rounded-xl bg-white/3 p-3"><Terminal className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><div><p className="font-semibold text-white">Python service · <span className="font-mono">nagpur_uhi</span></p><p className="mt-0.5 text-slate-400">Production pipeline: satellite acquisition, cloud masking, compositing, scikit-learn models (spatial GroupKFold), isolation-forest anomalies, GeoTIFF export and a FastAPI endpoint set. Runs at native 30 m resolution.</p></div></div>
            </div>
          </Card>
          <Card title="Data provenance" subtitle="What every number is built on">
            <ul className="space-y-1.5 text-xs text-slate-300">
              {["Landsat 8/9 Collection-2 Level-2 (surface reflectance + surface temperature), WRS-2 path 144 / row 045", "Sentinel-2 L2A (10–20 m optical), tile 44QLJ", "Pre-monsoon window 1 Mar – 31 May, 2019–2024 — clearest skies, peak surface heating", "Per-pixel median composites; scenes > 45 % cloud rejected; ≥ 3 clear observations flagged", "Analysis grid 200 m (WGS 84); 18 planning zones; population from ward estimates"].map((t) => <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />{t}</li>)}
            </ul>
          </Card>
          <Card title="Quality controls" subtitle="How results are kept honest">
            <ul className="space-y-1.5 text-xs text-slate-300">
              {["Spatial block cross-validation instead of random splits", "Blind back-test of the outlook on the most recent season", "Linear baseline always reported next to the ML result", "Provenance tags on every model-derived figure", "Uncertainty bands from residual seasonal variability", "Unit + end-to-end tests for both runtimes (pipeline and ML)"].map((t) => <li key={t} className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />{t}</li>)}
            </ul>
          </Card>
        </div>
      </div>
    ),
    models: (
      <div className="grid gap-4 lg:grid-cols-2">
        {MODEL_CARDS.map((m) => (
          <div key={m.name} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-300"><m.icon className="h-5 w-5" /></span><div><h3 className="text-sm font-semibold text-white">{m.name}</h3><p className="text-xs text-slate-400">{m.role}</p></div></div>
              <Method kind="ml" />
            </div>
            <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
              <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Algorithm</dt><dd className="mt-1 text-slate-300">{m.algo}</dd></div>
              <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Inputs</dt><dd className="mt-1 text-slate-300">{m.features}</dd></div>
              <div className="sm:col-span-2"><dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Validation</dt><dd className="mt-1 text-slate-300">{m.validation}</dd></div>
              <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Used in</dt><dd className="mt-1 space-y-0.5">{m.usedIn.map((u) => <p key={u} className="text-slate-300">• {u}</p>)}</dd></div>
              <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Limitations</dt><dd className="mt-1 text-slate-400">{m.caveat}</dd></div>
            </dl>
          </div>
        ))}
      </div>
    ),
    validation: (
      <div className="space-y-4">
        <LiveValidation />
        <ForecastValidation />
      </div>
    ),
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-lg"><BookOpen className="h-4 w-4" /></span>
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Methodology</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">How the platform turns raw satellite scenes into decisions: the processing architecture, the machine-learning models behind each component, how they are validated, and how to reproduce every figure with the Python service.</p>
        </div>
        <button onClick={() => setView("overview")} className="text-xs font-medium text-slate-400 hover:text-white">← Back to overview</button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {([
          { key: "architecture", label: "Architecture", hint: "Acquisition → serving", icon: Database },
          { key: "models", label: "Model cards", hint: "Algorithm · inputs · validation · limits", icon: BrainCircuit },
          { key: "validation", label: "Live validation", hint: "Held-out skill on this cube", icon: ShieldCheck },
        ] as { key: Section; label: string; hint: string; icon: typeof Database }[]).map((t) => (
          <button key={t.key} onClick={() => setSection(t.key)} className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition", section === t.key ? "border-orange-400/50 bg-orange-500/10" : "border-white/10 bg-slate-900/60 hover:border-white/25")}>
            <t.icon className={cn("h-5 w-5 shrink-0", section === t.key ? "text-orange-300" : "text-slate-400")} />
            <span><span className="block text-sm font-semibold text-white">{t.label}</span><span className="block text-[11px] text-slate-400">{t.hint}</span></span>
          </button>
        ))}
      </div>
      {body[section]}
    </div>
  );
}
