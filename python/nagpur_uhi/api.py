"""REST back-end (FastAPI) that serves the analysis to the React interface.

    pip install fastapi uvicorn matplotlib
    python -m nagpur_uhi serve --port 8000

Endpoints
    GET  /api/summary                     city stats, regression, trends, hotspots, quality
    GET  /api/zones                       zonal statistics + GeoJSON
    GET  /api/zones/{id}?year=2024        info-panel text + numbers for one zone
    GET  /api/compare?a=cbd&b=seminary    zone A vs zone B
    GET  /api/raster/{metric}/{year}      raster as JSON grid (metric: lst|ndvi|ndbi|hotspot|dlst)
    GET  /api/raster/{metric}/{year}.png  colour-mapped PNG overlay for Leaflet (bounds in headers)
    GET  /api/pixel?lat=21.14&lon=79.08   time-series for one pixel
    POST /api/scenario                    {"zone":"besa","veg":20,"built":-5,"buildings":0,"baseline":2030}
    GET  /api/ml                          ML report (model CV, importance, clusters, islands, anomalies, forecast)
    POST /api/ml/scenario                 {"zone":"besa","veg":20,"built":0}  → non-linear ΔLST (GBM) vs linear
    GET  /api/years                       available years with data quality
    GET  /api/download/geotiff/{metric}/{year}  download GeoTIFF file
    GET  /api/download/png/{metric}/{year}      download PNG map with filename
    GET  /api/download/json/{year}              download year-specific analysis JSON
"""
from __future__ import annotations

import io
from functools import lru_cache

import numpy as np

try:
    from fastapi import FastAPI, HTTPException, Query
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import Response
    from pydantic import BaseModel
except ImportError as e:  # pragma: no cover
    raise SystemExit("pip install fastapi uvicorn pydantic") from e

from . import config as C
from .cli import CUBE_PATH
from .cube import Cube
from .export import analysis_bundle
from .fetch import read_catalogue
from .preprocess import quality_report
from .scenario import ScenarioModel
from .temporal import hotspot_persistence
from .zones import compare_zones, describe_zone, rasterize_zones

app = FastAPI(title="Nagpur UHI API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@lru_cache(maxsize=1)
def state():
    cube = Cube.load(CUBE_PATH)
    bundle = analysis_bundle(cube, quality_report(cube, read_catalogue()))
    zone_idx = rasterize_zones(cube)
    model = ScenarioModel.from_cube(cube, zone_idx, bundle["zones"])
    return cube, bundle, zone_idx, model


class ScenarioRequest(BaseModel):
    zone: str = "besa"
    veg: float = 0.0
    built: float = 0.0
    buildings: int = 0
    baseline: int | None = None


@app.get("/api/summary")
def summary():
    _, b, _, _ = state()
    return {k: b[k] for k in ("meta", "city", "regression", "trends", "change_2019_2024", "hotspots", "pixel_trend", "quality")}


@app.get("/api/zones")
def zones():
    _, b, _, _ = state()
    return {"zones": b["zones"], "geojson": b["zones_geojson"]}


@app.get("/api/zones/{zone_id}")
def zone(zone_id: str, year: int = Query(default=None)):
    cube, b, _, _ = state()
    row = next((z for z in b["zones"] if z["id"] == zone_id), None)
    if not row:
        raise HTTPException(404, "unknown zone")
    y = year or cube.years[-1]
    row = {**row, "by_year": {int(k): v for k, v in row["by_year"].items()}}
    return {"zone": row, "year": y, "description": describe_zone(row, y)}


@app.get("/api/compare")
def compare(a: str, b: str, year: int = Query(default=None)):
    cube, bundle, _, _ = state()
    rows = [{**z, "by_year": {int(k): v for k, v in z["by_year"].items()}} for z in bundle["zones"]]
    return compare_zones(rows, a, b, year or cube.years[-1])


def _raster(metric: str, year: int) -> np.ndarray:
    cube, _, _, _ = state()
    if metric == "hotspot":
        return hotspot_persistence(cube).astype(np.float32)
    if metric == "dlst":
        return cube.lst[year] - cube.lst[cube.years[0]]
    if metric not in ("lst", "ndvi", "ndbi") or year not in cube.years:
        raise HTTPException(404, "unknown metric/year")
    return cube.layer(metric, year)


@app.get("/api/raster/{metric}/{year}")
def raster(metric: str, year: int):
    cube, _, _, _ = state()
    arr = _raster(metric, year)
    return {"metric": metric, "year": year, "bounds": list(cube.bounds), "shape": list(cube.shape),
            "values": np.round(np.nan_to_num(arr, nan=-9999), 3).tolist()}


@app.get("/api/raster/{metric}/{year}.png")
def raster_png(metric: str, year: int):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from .export import COLORMAPS

    cube, _, _, _ = state()
    arr = _raster(metric, year)
    cmap, lo, hi, _ = COLORMAPS[metric]
    rgba = plt.get_cmap(cmap)(np.clip((arr - lo) / (hi - lo), 0, 1))
    if metric in ("lst", "ndvi", "ndbi"):
        rgba[cube.water] = (0.05, 0.16, 0.29, 1.0)
    rgba[~np.isfinite(arr)] = (0, 0, 0, 0)
    buf = io.BytesIO()
    plt.imsave(buf, rgba, format="png")
    west, south, east, north = cube.bounds
    return Response(buf.getvalue(), media_type="image/png", headers={"X-Bounds": f"{south},{west},{north},{east}"})


@app.get("/api/pixel")
def pixel(lat: float, lon: float):
    cube, _, zone_idx, _ = state()
    rc = cube.cell_of(lat, lon)
    if rc is None:
        raise HTTPException(404, "outside AOI")
    r, c = rc
    zi = int(zone_idx[r, c])
    return {"lat": lat, "lon": lon, "water": bool(cube.water[r, c]), "zone": C.ZONES[zi]["name"] if zi >= 0 else None,
            "hotspot_years": int(hotspot_persistence(cube)[r, c]),
            "series": [{"year": y, "lst": float(cube.lst[y][r, c]), "ndvi": float(cube.ndvi[y][r, c]), "ndbi": float(cube.ndbi[y][r, c])} for y in cube.years]}


@lru_cache(maxsize=1)
def ml_state():
    from .ml import MLScenarioModel, ml_report

    cube, _, _, _ = state()
    return ml_report(cube), MLScenarioModel.from_cube(cube)


@app.get("/api/ml")
def ml():
    rep, _ = ml_state()
    return rep


class MLScenarioRequest(BaseModel):
    zone: str = "besa"
    veg: float = 0.0
    built: float = 0.0


@app.post("/api/ml/scenario")
def ml_scenario(req: MLScenarioRequest):
    _, model = ml_state()
    return model.run(req.zone, req.veg, req.built)


@app.post("/api/scenario")
def scenario(req: ScenarioRequest):
    _, _, _, model = state()
    try:
        res = model.run(req.zone, req.veg, req.built, buildings=req.buildings, baseline_year=req.baseline)
    except StopIteration:
        raise HTTPException(404, "unknown zone")
    out = res.to_dict()
    out["sensitivity"] = model.sensitivity(req.zone, req.built, baseline_year=req.baseline)
    return out


@app.get("/api/download/geotiff/{metric}/{year}")
def download_geotiff(metric: str, year: int):
    """Download GeoTIFF for LST/NDVI/NDBI for a specific year."""
    import rasterio
    from rasterio.transform import from_bounds
    
    cube, _, _, _ = state()
    arr = _raster(metric, year)
    
    if metric not in ("lst", "ndvi", "ndbi"):
        raise HTTPException(404, "Only lst, ndvi, ndbi supported for GeoTIFF")
    
    # Create GeoTIFF in memory
    buf = io.BytesIO()
    west, south, east, north = cube.bounds
    transform = from_bounds(west, south, east, north, cube.shape[1], cube.shape[0])
    
    with rasterio.MemoryFile() as memfile:
        with memfile.open(
            driver="GTiff",
            height=cube.shape[0],
            width=cube.shape[1],
            count=1,
            dtype=arr.dtype,
            crs="EPSG:4326",
            transform=transform,
            compress="deflate",
            nodata=-9999
        ) as dataset:
            dataset.write(np.nan_to_num(arr, nan=-9999), 1)
            dataset.set_band_description(1, f"{metric.upper()}_{year}")
        
        buf = io.BytesIO(memfile.read())
    
    filename = f"nagpur_{metric}_{year}.tif"
    return Response(
        buf.getvalue(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.get("/api/download/png/{metric}/{year}")
def download_png_file(metric: str, year: int):
    """Download PNG with proper filename for saving."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from .export import COLORMAPS
    
    cube, _, _, _ = state()
    arr = _raster(metric, year)
    cmap, lo, hi, _ = COLORMAPS[metric]
    rgba = plt.get_cmap(cmap)(np.clip((arr - lo) / (hi - lo), 0, 1))
    
    if metric in ("lst", "ndvi", "ndbi"):
        rgba[cube.water] = (0.05, 0.16, 0.29, 1.0)
    rgba[~np.isfinite(arr)] = (0, 0, 0, 0)
    
    buf = io.BytesIO()
    plt.imsave(buf, rgba, format="png", dpi=150)
    
    filename = f"nagpur_{metric}_{year}.png"
    return Response(
        buf.getvalue(),
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.get("/api/download/json/{year}")
def download_json_year(year: int):
    """Download complete analysis bundle for a specific year."""
    import json
    
    cube, bundle, _, _ = state()
    
    if year not in cube.years:
        raise HTTPException(404, f"Year {year} not available")
    
    # Create year-specific bundle
    year_data = {
        "year": year,
        "meta": bundle["meta"],
        "city": bundle["city"][str(year)],
        "regression": bundle["regression"][str(year)],
        "zones": [
            {
                **{k: v for k, v in z.items() if k != "by_year"},
                "stats": z["by_year"][str(year)]
            }
            for z in bundle["zones"]
        ],
        "bounds": list(cube.bounds),
        "shape": list(cube.shape)
    }
    
    json_str = json.dumps(year_data, indent=2)
    filename = f"nagpur_analysis_{year}.json"
    
    return Response(
        json_str,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.get("/api/years")
def available_years():
    """Get list of available years with data quality info."""
    cube, bundle, _, _ = state()
    return {
        "years": cube.years,
        "quality": bundle.get("quality", [])
    }
