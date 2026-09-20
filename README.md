# Smart Geospatial Platform - Nagpur Urban Heat Intelligence

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.2-blue)
![Python](https://img.shields.io/badge/Python-3.14-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)

An interactive satellite data platform for urban heat island analysis using real Landsat 8/9 and Sentinel-2 imagery. Features ML-powered predictions, what-if scenario modeling, and downloadable geospatial data exports.

## 🌟 Features

- **🛰️ Real Satellite Data** - Landsat 8/9 & Sentinel-2 via Microsoft Planetary Computer
- **📊 Interactive Analysis** - LST, NDVI, NDBI indices with temporal trends (2019-2024)
- **🤖 Machine Learning** - Gradient boosting, random forest, clustering, forecasting
- **🎮 Scenario Modeling** - What-if tool for urban planning decisions
- **🗺️ 3D Visualization** - Interactive maps with React Three Fiber
- **📥 Data Export** - Download PNG, GeoTIFF, and JSON formats
- **⚡ Fast & Responsive** - Built with Vite, TailwindCSS, React 19

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (for frontend)
- Python 3.10+ (for satellite data pipeline)

### Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open **http://localhost:5173**

### Python Backend Setup (Optional - for real satellite data)

```bash
cd python

# Install dependencies
pip install -r requirements.txt

# Fetch satellite data (takes time)
python -m nagpur_uhi fetch --source pc --years 2019 2024

# Process data
python -m nagpur_uhi build --source raw
python -m nagpur_uhi analyze --png --geotiff
python -m nagpur_uhi ml --year 2024 --forecast 2030

# Start API server
python -m nagpur_uhi serve --port 8000
```

API available at **http://localhost:8000** (Docs: http://localhost:8000/docs)

### Quick Demo Mode

```bash
cd python
python -m nagpur_uhi run-all --source demo
python -m nagpur_uhi serve --port 8000
```

## 📁 Project Structure

```
SGP/
├── src/                      # React frontend
│   ├── components/          # Reusable UI components
│   ├── views/              # Main application views
│   ├── data/               # Data engine & models
│   └── ml/                 # Browser-based ML models
├── python/                  # Python backend pipeline
│   └── nagpur_uhi/         # Satellite data processing
│       ├── fetch.py        # Download from Planetary Computer
│       ├── preprocess.py   # Cloud masking & compositing
│       ├── indices.py      # LST/NDVI/NDBI calculation
│       ├── ml.py           # Machine learning models
│       └── api.py          # FastAPI REST endpoints
├── index.html
├── package.json
└── README.md
```

## 🌐 Application Views

1. **Overview** - Platform summary with key statistics
2. **Data Pipeline** - Data collection, preprocessing, export panel
3. **Index Analysis** - LST, NDVI, NDBI with correlations
4. **Temporal & Hotspots** - Change detection, persistent hotspots
5. **Scenario Lab** - Interactive what-if modeling tool
6. **Interactive Map** - 2D/3D geospatial visualization
7. **Methodology** - Models, validation, architecture details

## 📊 Data Sources

### Real Satellite Data
- **Landsat 8/9 Collection 2 Level-2** (30m resolution)
- **Sentinel-2 L2A** (10-20m resolution)
- **Source**: Microsoft Planetary Computer STAC API
- **Coverage**: Nagpur, India (21.02°N-21.26°N, 78.94°E-79.22°E)
- **Period**: Pre-monsoon (March-May) 2019-2024

### Demo Data
The frontend includes procedurally generated synthetic data calibrated to Nagpur's geography for instant demo purposes. The Python pipeline connects to real satellite archives.

## 🔌 API Endpoints

### Data Queries
```
GET  /api/years                          # Available years
GET  /api/summary                        # City statistics
GET  /api/zones                          # Zonal data + GeoJSON
GET  /api/raster/{metric}/{year}         # Raster data (JSON)
```

### Downloads
```
GET  /api/download/png/{metric}/{year}      # PNG map
GET  /api/download/geotiff/{metric}/{year}  # GeoTIFF file
GET  /api/download/json/{year}              # Analysis JSON
```

### Machine Learning
```
GET  /api/ml                             # ML models & results
POST /api/scenario                       # What-if modeling
```

**Metrics**: `lst` (temperature), `ndvi` (vegetation), `ndbi` (built-up)

## 🛠️ Tech Stack

**Frontend:**
- React 19.2 + TypeScript
- Vite 7 (build tool)
- TailwindCSS 4 (styling)
- React Three Fiber (3D visualization)
- Recharts (charts)
- Leaflet (2D maps)

**Backend:**
- Python 3.14
- FastAPI (REST API)
- rasterio (geospatial)
- scikit-learn (ML)
- numpy, pandas
- pystac-client (satellite data)

## 📥 Data Export Formats

### PNG Images
- Colour-mapped visualizations
- 200m resolution
- Suitable for presentations

### GeoTIFF Files
- Georeferenced raster data
- EPSG:4326 (WGS 84)
- Open in QGIS, ArcGIS
- NoData: -9999

### JSON Data
- Complete analysis bundle
- City & zonal statistics
- Metadata & quality info

## 🤖 Machine Learning Models

1. **LST Surface Model** - Gradient boosting (R² 0.75)
2. **Land-cover Clustering** - k-means (5 classes)
3. **Heat Island Segmentation** - DBSCAN density clustering
4. **2030 Outlook** - Hybrid forecast with spatial CV

## 📖 Documentation

- [Data Sources](./DATA_SOURCE_INFO.md) - Detailed satellite data info
- [Python API Docs](http://localhost:8000/docs) - Interactive API documentation
- [Methodology](./src/views/Methodology.tsx) - In-app methodology view

## 🎓 For Researchers & Developers

### Spatial Cross-Validation
Models use spatial block holdout (2km blocks, 22% test) to avoid overestimating skill under spatial autocorrelation.

### Reproducibility
```bash
cd python
python -m nagpur_uhi fetch --source pc --years 2019 2024
python -m nagpur_uhi build
python -m nagpur_uhi analyze --geotiff
```

All parameters in `python/nagpur_uhi/config.py`

## 🌍 Use Cases

- Urban heat island monitoring
- Climate adaptation planning
- Green infrastructure assessment
- Land use change analysis
- Policy decision support
- Research & education

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- **Satellite Data**: NASA (Landsat), ESA (Sentinel-2)
- **Platform**: Microsoft Planetary Computer
- **City Data**: Nagpur Municipal Corporation

## 📧 Contact

For questions or collaboration:
- Open an issue on GitHub
- Check documentation in `/docs`

---

**Built with ❤️ for sustainable urban planning**
