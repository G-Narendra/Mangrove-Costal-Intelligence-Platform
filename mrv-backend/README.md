<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.12" />
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TensorFlow-2.16-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="TensorFlow" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Google_Earth_Engine-API-4285F4?style=for-the-badge&logo=google-earth&logoColor=white" alt="GEE" />
</p>

<h1 align="center">⚙️ Coastal Sentinel — Backend API & Pipeline</h1>
<h3 align="center">Autonomous Satellite-to-Ledger MRV Pipeline & Model Serving Engine</h3>

<p align="center">
  <strong>Backend Engine for the Mangrove Carbon Intelligence Platform (MCIP)</strong><br>
  <em>MSc Data Science & AI Thesis Project | Middlesex University Dubai</em>
</p>

---

## 🌟 Overview

**Coastal Sentinel API** is the core computational backbone of MCIP. Built on **Python 3.12** and **FastAPI**, it orchestrates the autonomous ingestion of multi-sensor satellite data, executes deep learning transfer imputation for NASA GEDI LiDAR, computes IPCC Tier-2 carbon accounts, serves real-time ST-GNN carbon forecasts, and generates multi-tier ecological anomaly alerts.

### Key Components:
- **Autonomous Ingestion (`/ingestion`):** Automated retrieval and synchronicity gating across ESA Sentinel-1 SAR, Sentinel-2 Multispectral, NASA GEDI LiDAR, and OpenWeatherMap.
- **Neural Imputation Engine (`/models`, `/processing/imputer.py`):** 8 pre-trained Keras neural regressors that predict missing canopy structure attributes (RH100, RH98, RH92, PAI, FHD, FCOVER, Elevation, Biomass) solving GEDI orbital track sparsity in arid coastal zones ($R^2 = 0.812$).
- **Spatio-Temporal GNN (`STGNN_MODEL.h5`, `/processing/stgnn.py`):** Serves 12-month auto-regressive carbon predictions taking past 3-month graph snapshots over 25 DBSCAN patches and 73 directional tidal flow edges ($R^2 = 0.892$).
- **Autonomous Scheduler (`scheduler.py`):** Self-healing sleep-wake loop that automatically triggers on the 1st of every month to process newly available satellite rasters.
- **Firestore Synchronization (`/sync`):** Synchronizes patch telemetry, health scores, and alerts directly to Google Cloud Firestore (`me-central1`).

---

## 🚀 Quick Start & Local Setup

### Prerequisites:
- Python ≥ 3.10
- Google Earth Engine (authenticated)
- NASA Earthdata account
- Firebase Service Account Key

### 1. Install Dependencies:
```bash
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment:
Copy `.env.example` to `.env` and provide your credentials:
```bash
cp .env.example .env
```

### 3. Run Pipeline or API:
```bash
# Execute a single monthly cycle manually:
python main.py --month 2026-05 --region UAE

# Or run the autonomous scheduler daemon:
python scheduler.py --daemon
```

---

## 🐳 Docker & Cloud Deployment

This service includes a production-ready `Dockerfile` and can be deployed to **Render**, **Railway**, or **DigitalOcean App Platform**:

### Build & Run via Docker:
```bash
docker build -t coastal-sentinel-api .
docker run -p 8000:8000 --env-file .env coastal-sentinel-api
```

### Deploy to Render / Railway:
1. Connect this repository to Render/Railway.
2. Select **Docker** environment or **Python** environment with Python 3.12.
3. Start Command: `python scheduler.py --daemon`
4. Set your environment variables from `.env.example`.

---

## 🛡 Data Sovereignty & Security

- **Strict Secret Isolation:** All service account JSON keys and environment variables are strictly excluded via `.gitignore` and `.dockerignore`.
- **In-Country Hosting:** Configured for `me-central1` (UAE/Doha) complying with UAE Federal Decree-Law No. 45/2021.
