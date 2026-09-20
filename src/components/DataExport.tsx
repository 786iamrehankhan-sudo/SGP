import { useState } from "react";
import { Download, FileJson, FileImage, Map } from "lucide-react";
import { Card, Pill, Segmented } from "./ui";
import { cn } from "@/utils/cn";
import type { Year } from "@/data/nagpur";

interface DataExportProps {
  availableYears: Year[];
  apiBaseUrl?: string;
}

type ExportFormat = "png" | "geotiff" | "json";
type Layer = "lst" | "ndvi" | "ndbi";

export default function DataExport({ availableYears, apiBaseUrl = "http://localhost:8000" }: DataExportProps) {
  const [selectedYear, setSelectedYear] = useState<Year>(availableYears[availableYears.length - 1]);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [layer, setLayer] = useState<Layer>("lst");
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      let url = "";
      
      if (format === "json") {
        url = `${apiBaseUrl}/api/download/json/${selectedYear}`;
      } else if (format === "png") {
        url = `${apiBaseUrl}/api/download/png/${layer}/${selectedYear}`;
      } else if (format === "geotiff") {
        url = `${apiBaseUrl}/api/download/geotiff/${layer}/${selectedYear}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      
      // Extract filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/);
      a.download = filenameMatch ? filenameMatch[1] : `nagpur_${layer}_${selectedYear}.${format === "geotiff" ? "tif" : format}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download error:", error);
      alert(`Download failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card title="Data Export" subtitle="Download satellite analysis products">
      <div className="space-y-4">
        {/* Year Selector */}
        <div>
          <label className="mb-2 block text-xs font-medium text-slate-300">Select Year</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                  selectedYear === year
                    ? "border-orange-400/50 bg-orange-500/15 text-orange-200"
                    : "border-white/10 text-slate-300 hover:bg-white/5"
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Format Selector */}
        <div>
          <label className="mb-2 block text-xs font-medium text-slate-300">Export Format</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setFormat("png")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition",
                format === "png"
                  ? "border-sky-400/50 bg-sky-500/15 text-sky-200"
                  : "border-white/10 text-slate-300 hover:bg-white/5"
              )}
            >
              <FileImage className="h-4 w-4" />
              <span className="font-medium">PNG Image</span>
            </button>
            <button
              onClick={() => setFormat("geotiff")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition",
                format === "geotiff"
                  ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                  : "border-white/10 text-slate-300 hover:bg-white/5"
              )}
            >
              <Map className="h-4 w-4" />
              <span className="font-medium">GeoTIFF</span>
            </button>
            <button
              onClick={() => setFormat("json")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition",
                format === "json"
                  ? "border-violet-400/50 bg-violet-500/15 text-violet-200"
                  : "border-white/10 text-slate-300 hover:bg-white/5"
              )}
            >
              <FileJson className="h-4 w-4" />
              <span className="font-medium">JSON Data</span>
            </button>
          </div>
        </div>

        {/* Layer Selector (only for PNG and GeoTIFF) */}
        {format !== "json" && (
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-300">Data Layer</label>
            <Segmented
              size="sm"
              options={[
                { value: "lst", label: "LST (Temperature)" },
                { value: "ndvi", label: "NDVI (Vegetation)" },
                { value: "ndbi", label: "NDBI (Built-up)" },
              ]}
              value={layer}
              onChange={setLayer}
            />
          </div>
        )}

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition",
            downloading
              ? "cursor-not-allowed bg-slate-700 text-slate-400"
              : "bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:from-orange-600 hover:to-rose-600"
          )}
        >
          <Download className="h-4 w-4" />
          {downloading ? "Downloading..." : `Download ${format.toUpperCase()} for ${selectedYear}`}
        </button>

        {/* Info */}
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-[11px] leading-relaxed text-slate-400">
            {format === "png" && "PNG images are colour-mapped visualizations suitable for presentations and reports."}
            {format === "geotiff" && "GeoTIFF files contain georeferenced data that can be opened in QGIS, ArcGIS, or other GIS software."}
            {format === "json" && "JSON files contain complete analysis data including city statistics, zonal data, and metadata."}
          </p>
          {format !== "json" && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill tone="slate" className="text-[10px]">EPSG:4326 (WGS 84)</Pill>
              <Pill tone="slate" className="text-[10px]">200m resolution</Pill>
              <Pill tone="slate" className="text-[10px]">Pre-monsoon composite</Pill>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
