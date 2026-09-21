<p align="center">
  <img src="mrv/public/logo.png" alt="MCIP Logo" width="180" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/MSc_Thesis-CST4090-purple?style=for-the-badge" alt="MSc Thesis" />
  <img src="https://img.shields.io/badge/Middlesex_University-Dubai-red?style=for-the-badge" alt="MDX Dubai" />
  <img src="https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.12" />
  <img src="https://img.shields.io/badge/Next.js-16.x-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TensorFlow-2.16-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="TensorFlow" />
  <img src="https://img.shields.io/badge/Verra_VM0033-Compliant-emerald?style=for-the-badge" alt="Verra VM0033" />
</p>

<h1 align="center">🌿 Mangrove Coastal Intelligence Platform (MCIP)</h1>
<h3 align="center">Spatio-Temporal Graph Neural Networks for Automated Blue Carbon MRV in UAE Mangrove Ecosystems</h3>

<p align="center">
  <strong>MSc Data Science & Artificial Intelligence (CST4090) Post-Graduate Thesis</strong><br>
  <strong>Middlesex University Dubai — Department of Computer Engineering & Informatics</strong><br>
  <em>Author: Narendra Gandikota (NG661@live.mdx.ac.uk) &nbsp;|&nbsp; Supervisor: Dr. Krishnadas Nanath &nbsp;|&nbsp; October 2026</em>
</p>

<p align="center">
  <a href="#-academic-abstract">Abstract</a> •
  <a href="#-central-research-question">Research Inquiry</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-empirical-benchmark-results">Benchmark Results</a> •
  <a href="#-research-notebooks--visuals">Research Notebooks</a> •
  <a href="#-production-repositories">Live Deployments</a> •
  <a href="#-regulatory-compliance">Verra VM0033</a> •
  <a href="#-references">References</a>
</p>

---

## 🏛 Live Production Deployments

| Component | Target Platform | Repository | Live Deployment |
| :--- | :--- | :--- | :--- |
| **Frontend Web Platform** | Vercel Cloud | [`Coastal-Sentinel-Web`](https://github.com/G-Narendra/Coastal-Sentinel-Web) | `https://coastal-sentinel-web.vercel.app` |
| **Backend API & Models** | Render / DigitalOcean | [`Coastal-Sentinel-API`](https://github.com/G-Narendra/Coastal-Sentinel-API) | `https://coastal-sentinel-api.onrender.com/docs` |
| **Academic Master Repository** | GitHub | [`Mangrove-Costal-Intelligence-Platform`](https://github.com/G-Narendra/Mangrove-Costal-Intelligence-Platform) | Current Repository |

---

## 📋 Academic Abstract

The United Arab Emirates harbors over 40,000 hectares of coastal mangrove forests (*Avicennia marina*), sequestering up to 6 tCO₂e/ha/year in aboveground biomass and sediment. Despite their pivotal role in the UAE Net Zero 2050 Strategic Initiative, manual Measurement, Reporting and Verification (MRV) methods remain prohibitively expensive ($50,000+ per verification cycle) and temporally lagged (3 to 6 months), excluding UAE blue carbon assets from the international $2B Voluntary Carbon Market (VCM).

This thesis presents the **Mangrove Carbon Intelligence Platform (MCIP)**, an automated satellite-to-ledger MRV system powered by **Spatio-Temporal Graph Neural Networks (ST-GNN)**. The platform ingests 69 continuous monthly time-series snapshots (January 2021 – September 2026) combining ESA Sentinel-2 (10m multispectral), ESA Sentinel-1 (C-band SAR VV/VH), NASA GEDI L2A (spaceborne LiDAR), and OpenWeatherMap reanalysis. Addressing the severe sparse orbital coverage of NASA GEDI in hyper-arid coastal zones (~4% monthly track density), we introduce a deep neural transfer learning architecture trained on dense Sundarbans reference tracks and fine-tuned on UAE ground-truth coordinates ($R^2 = 0.812$). 

Coastal mangroves are delineated into 25 ecological patch nodes via DBSCAN clustering, connected by 73 directional tidal flow proxy edges (modeling allochthonous sediment flux) and 7 spatial proximity edges. The proposed ST-GNN outperforms non-spatial and non-temporal baselines, achieving **$R^2 = 0.892$**, **RMSE = 0.142 MgC/ha** (a 63% error reduction over Random Forest), and **NSE = 0.854**. Explainable AI (SHAP) reveals that Sentinel-2 NDVI (38%), SAR VV backscatter (29%), and GEDI RH100 canopy height (21%) dominate carbon accumulation. The system is production-deployed as **Coastal Sentinel** on Next.js 15 and FastAPI within the UAE sovereign cloud region (`me-central1`), featuring real-time GIS telemetry, an autonomous 3-tier anomaly alert engine, and 1-click Verra VM0033-compliant PDF certification dossiers.

---

## 🎯 Central Research Question & Objectives

> **Primary Research Question:**  
> *"Can a Spatio-Temporal Graph Neural Network (ST-GNN) trained on multi-source satellite data and hydrodynamic tidal connectivity provide significantly more accurate, robust, and explainable monthly carbon sequestration estimates and 12-month forecasts than non-spatial or non-temporal baseline models?"*

### Research Objectives:
1. **Multi-Sensor Fusion:** Ingest and co-register ESA Sentinel-1 SAR, Sentinel-2 Multispectral, and NASA GEDI LiDAR over 69 continuous months across 3,230 verified UAE mangrove coordinate points.
2. **Neural LiDAR Imputation:** Develop a transfer learning imputation engine resolving NASA GEDI track sparsity in arid mangrove ecosystems.
3. **Hydrodynamic Graph Formulation:** Formulate a novel spatial and tidal adjacency graph capturing sedimental carbon transport across coastal patches.
4. **Spatio-Temporal Modeling:** Train and benchmark an ST-GNN architecture against 4 baseline models (Random Forest, Graph-RF, Pure LSTM, Static GCN) on unseen test horizons.
5. **Causal Attribution:** Formulate SHAP feature attribution satisfying Verra VM0033 Additionality and Permanence verification audits.
6. **Production Deployment:** Deliver the full-stack *Coastal Sentinel* platform with real-time GIS map, autonomous alert engine, and 1-click auditable compliance dossiers.

---

## 🏗 System Architecture

```
                                 SPACE SENSORS & SATELLITE REPOSITORY
                                ┌────────────────────────────────────┐
                                │  ESA Sentinel-2 (10m Multispectral)│
                                │  ESA Sentinel-1 (C-band SAR VV/VH) │
                                │  NASA GEDI L2A (LiDAR RH100, PAI)  │
                                │  OpenWeatherMap ERA5 Reanalysis    │
                                └─────────────────┬──────────────────┘
                                                  │
                                                  ▼
                                       SYNCHRONICITY GATE & QA
                                (Automated GEE Ingestion & Validation)
                                                  │
                                                  ▼
                                    NEURAL LiDAR IMPUTATION ENGINE
                            (Sundarbans → UAE Arid-Coast Transfer Learning)
                                                  │
                                                  ▼
                                   SPATIAL & TIDAL GRAPH FORMULATION
                             ┌───────────────────────────────────────────┐
                             │  25 DBSCAN Coastal Patch Nodes (N)        │
                             │  73 Directional Tidal Flow Proxy Edges    │
                             │  7 Euclidean Spatial Proximity Edges      │
                             └────────────────────┬──────────────────────┘
                                                  │
                                                  ▼
                                  SPATIO-TEMPORAL GNN FORECAST ENGINE
                             ┌───────────────────────────────────────────┐
                             │  Input: X ∈ R^(N × T × F) (T=3 lookback)  │
                             │  Spatial: Â = D̃^(-½) · Ã · D̃^(-½) GCN      │
                             │  Temporal: Bidirectional LSTM Sequence    │
                             │  Output: 12-Month Auto-Regressive Forecast│
                             └────────────────────┬──────────────────────┘
                                                  │
                         ┌────────────────────────┼────────────────────────┐
                         ▼                        ▼                        ▼
                 SHAP EXPLAINABILITY     AUTONOMOUS ALERT ENGINE   VERRA VM0033 DOSSIERS
               (Photosynthetic vigor &  (Level 1-3 stress alerts   (Additionality, buffer
                sediment attribution)   with causal narrative)      tamper-evident PDF)
                         │                        │                        │
                         └────────────────────────┼────────────────────────┘
                                                  │
                                                  ▼
                                       FIRESTORE (me-central1)
                                (UAE Sovereign Cloud Data Residency)
                                                  │
                                                  ▼
                                   COASTAL SENTINEL PRODUCTION WEB
                            (Next.js 15 + Leaflet GIS + XAI Co-pilot)
```

---

## 📊 Empirical Benchmark Results

All models were evaluated on the held-out 15-month test split (July 2025 – September 2026) across all 25 coastal patches:

| Architecture | Model Paradigm | RMSE (MgC/ha) | MAE (MgC/ha) | $R^2$ Score | Nash-Sutcliffe (NSE) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Random Forest** | Non-spatial, Non-temporal | 0.384 | 0.291 | 0.612 | 0.584 |
| **Graph Random Forest** | Spatial embeddings, Non-temporal | 0.292 | 0.224 | 0.721 | 0.702 |
| **Pure LSTM** | Temporal sequence, Non-spatial | 0.241 | 0.183 | 0.789 | 0.763 |
| **Static GCN** | Spatial graph, Non-temporal | 0.213 | 0.162 | 0.814 | 0.791 |
| **ST-GNN (MCIP Ours)** | **Spatio-Temporal Graph Neural Network** | **0.142** | **0.108** | **0.892** | **0.854** |

> **Key Finding:** ST-GNN achieves a **63% reduction in RMSE** compared to standard tabular models and a **41% reduction over pure LSTM**, validating the hypothesis that coastal mangrove carbon dynamics depend fundamentally on both upstream hydrodynamic tidal flows and sequential phenological cycles.

---

## 🔍 SHAP Causal Feature Attribution

Feature attribution computed via KernelSHAP against IPCC Tier-2 aboveground biomass equations:
- **Sentinel-2 NDVI (Photosynthetic Vigor):** `38%`
- **Sentinel-1 SAR VV Backscatter (Biomass Density):** `29%`
- **NASA GEDI LiDAR RH100 (Canopy Height):** `21%`
- **NASA GEDI PAI (Plant Area Index):** `8%`
- **Hydrodynamic Tidal Connectivity (Sediment Transport Edge):** `4%`

---

## 📁 Repository Structure

```
.
├── MCIP_Draft.docx               # Master Post-Graduate Thesis Draft Document
├── MCIP_Gantt_Chart.png          # 14-Week Research & Development Gantt Schedule
├── Literature_Database.csv       # Systematic Literature Review Matrix (60+ Studies)
├── graph_edges.csv               # Adjacency Edge Matrix for 25 Mangrove Patches
├── Ethics_Answers_Reference.md   # Institutional Ethics & Data Governance Declaration
├── README.md                     # Master Academic Project Documentation
│
├── research-notebooks/           # Research Jupyter Notebooks (Stages 1-4)
│   ├── STAGE_1.ipynb             # Ingestion & ANN Mangrove Pixel Classification
│   ├── STAGE_2.ipynb             # Multi-Modal Temporal Harmonization & Feature Eng.
│   ├── STAGE_3.ipynb             # GEDI Neural Imputation & Graph Formulation
│   └── STAGE_4.ipynb             # ST-GNN Training, Forecasting & Ablation Benchmarks
│
├── Visuals Notebooks/            # 27 High-Resolution Empirical Visuals & Maps
│   ├── Stage_1_Mangrove_Pixels_Predicted.png
│   ├── Stage_3_NetworkX_Graph_of_Sedimental_and_Tidal Connectivity.png
│   ├── Stage_3_All_GEDI_Imputation_Model_Evaluation.png
│   ├── web_Dashboard.png
│   ├── web_Costal_Map.png
│   └── ... (27 visual figures)
│
├── posters/                      # Publication Research Poster (44" × 44" Format)
│   ├── generate_mcip_poster.py   # Automated python-pptx poster generation script
│   ├── export_preview.ps1        # High-res (3000 × 3000) PowerPoint COM exporter
│   ├── mdx logo.png              # Official Middlesex University Dubai Logo
│   └── ppt/
│       ├── MCIP_Poster.pptx      # Master Presentation Poster
│       └── preview.png           # 3000 × 3000 px High-Res Poster Image
│
├── mrv/                          # Frontend Web Application (Next.js 15 App Router)
│   ├── src/                      # UI Components, GIS Maps, XAI Co-pilot, Reports
│   ├── public/                   # Project Logos & Static Assets
│   ├── package.json              # Frontend Dependencies
│   └── .env.example              # Environment Configuration Template
│
└── mrv-backend/                  # Backend API & Autonomous Pipeline (FastAPI)
    ├── main.py                   # Monthly MRV Orchestrator
    ├── scheduler.py              # Autonomous Daemon Scheduler
    ├── models/                   # ST-GNN (.h5) & 8 GEDI Imputation Regressors
    ├── sync/                     # Firestore Sync, Alert Engine & Health Scores
    ├── processing/               # ST-GNN Inference, Imputer & IPCC Carbon Math
    ├── ingestion/                # GEE, Sentinel-1/2, GEDI & Weather Ingestion
    ├── requirements.txt          # Backend Dependencies
    └── Dockerfile                # Production Container Configuration
```

---

## 📜 Regulatory Framework & Verra VM0033 Compliance

MCIP is engineered specifically to adhere to:
1. **Verra VM0033 Methodology (v2.1):** *Tidal Wetland and Seagrass Restoration*.
   - Automated Baseline Additionality modeling using multi-year pre-project Sentinel-2 baselines.
   - Dynamic Non-Permanence Risk Buffer computation (10–20% allocation based on extreme thermal / salinity stress metrics).
   - Tamper-evident PDF Dossier generation embedding cryptographic satellite hashes.
2. **IPCC Tier-2 Blue Carbon Accounting:**
   - $\text{Carbon Stock (MgC/ha)} = \text{Biomass} \times 0.47$
   - $\text{CO}_2\text{e (tCO}_2\text{e/ha)} = \text{Carbon Stock} \times (44 / 12)$
3. **UAE Data Sovereignty (Federal Decree-Law No. 45/2021):**
   - Full data localization using Google Cloud `me-central1` (Doha) ensuring compliance with UAE environmental and privacy regulations.

---

## 📚 Core Academic References

1. **Dubayah, R. et al. (2020).** *The Global Ecosystem Dynamics Investigation: High-resolution laser ranging of forest canopies.* Science of Remote Sensing, 1, 100002.
2. **Kipf, T.N. & Welling, M. (2017).** *Semi-supervised classification with graph convolutional networks.* International Conference on Learning Representations (ICLR).
3. **Yu, B., Yin, H. & Zhu, Z. (2018).** *Spatio-temporal graph convolutional networks: A deep learning framework for traffic forecasting.* IJCAI, pp. 3634–3640.
4. **Lundberg, S.M. & Lee, S.I. (2017).** *A unified approach to interpreting model predictions.* Advances in Neural Information Processing Systems (NeurIPS), pp. 4765–4774.
5. **Verra (2022).** *VM0033 Tidal Wetland and Seagrass Restoration Methodology, v2.1.* Washington DC: Verra.
6. **Macreadie, P.I. et al. (2021).** *The future of blue carbon science.* Nature Reviews Earth & Environment, 2(12).
7. **Hamilton, S.E. & Friess, D.A. (2018).** *Global carbon stocks and potential losses due to mangrove deforestation.* Nature Climate Change, 8(3).

---

## 👥 Authorship & Acknowledgments

- **Author:** Narendra Gandikota (MSc Data Science & AI, Middlesex University Dubai)
- **Academic Supervisor:** Dr. Krishnadas Nanath (Associate Professor, Middlesex University Dubai)
- **Institution:** Middlesex University Dubai, Dubai Knowledge Park, United Arab Emirates

*Developed with pride for the UAE National Blue Carbon Strategy & Net Zero 2050.*
