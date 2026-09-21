import os
from dotenv import load_dotenv

try:
    import ee
    try:
        ee.Initialize(project='mangroove-p')
    except Exception as _ee_err:
        pass
except ImportError:
    ee = None
# Load environment variables
load_dotenv()

# --- CONSTANTS & CONFIGURATION ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = CURRENT_DIR if os.path.exists(os.path.join(CURRENT_DIR, 'data')) else os.path.dirname(CURRENT_DIR)
DATA_DIR = os.path.join(BASE_DIR, 'data')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

# The main CSV that has historical data and unique coordinates (supports compressed .gz for Git compliance)
_uncompressed_csv = os.path.join(DATA_DIR, 'S1_S2_GEDI_Imputed_Monthly.csv')
_compressed_csv = os.path.join(DATA_DIR, 'S1_S2_GEDI_Imputed_Monthly.csv.gz')
IMPUTED_CSV_PATH = _uncompressed_csv if os.path.exists(_uncompressed_csv) else _compressed_csv
GRAPH_EDGES_PATH = os.path.join(DATA_DIR, 'graph_edges.csv')

# --- ENVIRONMENT VARIABLES ---
EARTHDATA_USERNAME = os.getenv("EARTHDATA_USERNAME")
EARTHDATA_PASSWORD = os.getenv("EARTHDATA_PASSWORD")
FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
if not FIREBASE_SERVICE_ACCOUNT_PATH or not os.path.exists(FIREBASE_SERVICE_ACCOUNT_PATH):
    local_key = os.path.join(CURRENT_DIR, "mangroove-startup-96309-firebase-adminsdk-fbsvc-12afac2c68.json")
    if os.path.exists(local_key):
        FIREBASE_SERVICE_ACCOUNT_PATH = local_key
GEE_PROJECT_ID = os.getenv("GEE_PROJECT_ID", "mangroove-p")
TARGET_START_MONTH = os.getenv("TARGET_START_MONTH", "2026-02")

# --- CARBON CALCULATION CONSTANTS ---
CARBON_FRACTION = 0.47
CO2_TO_C_RATIO = 44.0 / 12.0
ANNUAL_BASE_SEQ_RATE = 6.0

# --- MODEL INPUT FEATURES (From STAGE_3) ---
rh100_features = ['VV_backscatter', 'VH_backscatter', 'VV_coherence', 'VH_coherence', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B11', 'B12', 'SCL', 'NDVI', 'NDWI', 'NDSI', 'Moisture_index', 'SWIR', 'Scene_classification_map', 'False_color', 'False_color_urban', 'Highlight_Optimized_Natural_Color', 'True_color']
rh98_features = rh100_features.copy()
rh92_features = rh100_features.copy()
elevation_features = rh100_features.copy()
pai_features = rh100_features.copy()
fhd_features = rh100_features.copy()
fcover_features = rh100_features.copy()
biomass_features = rh100_features.copy()

# The final node feature columns for STGNN
node_feature_columns = [
    'patch_id', 'date',
    'VV_backscatter', 'VH_backscatter', 'VV_coherence', 'VH_coherence',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B11', 'B12',
    'SCL', 'NDVI', 'NDWI', 'NDSI', 'Moisture_index', 'SWIR',
    'Scene_classification_map', 'False_color', 'False_color_urban',
    'Highlight_Optimized_Natural_Color', 'True_color',
    'GEDI_canopy_height_rh100', 'GEDI_canopy_height_rh98',
    'GEDI_canopy_height_rh92', 'GEDI_elevation_lowestmode', 'GEDI_PAI',
    'GEDI_FHD', 'GEDI_FCOVER', 'GEDI_biomass_Mg_ha',
    'carbon_stock_MgC_ha', 'carbon_stock_tCO2e_ha',
    'monthly_absorption_MgC_ha', 'monthly_absorption_tCO2e_ha',
    'num_sedimental_outgoing', 'num_sedimental_incoming',
    'num_tidal_outgoing', 'num_tidal_incoming',
    'total_sedimental_connections', 'total_tidal_connections'
]

# The final models dict mapping target to its pre-trained h5
MODELS_CONFIG = {
    'GEDI_canopy_height_rh100': ('Model_GEDI_RH100.h5', rh100_features),
    'GEDI_canopy_height_rh98':  ('Model_GEDI_RH98.h5',  rh98_features),
    'GEDI_canopy_height_rh92':  ('Model_GEDI_RH92.h5',  rh92_features),
    'GEDI_elevation_lowestmode':('Model_GEDI_ELEVATION.h5', elevation_features),
    'GEDI_PAI':                 ('Model_GEDI_PAI.h5',    pai_features),
    'GEDI_FHD':                 ('Model_GEDI_FHD.h5',    fhd_features),
    'GEDI_FCOVER':              ('Model_GEDI_FCOVER.h5', fcover_features),
    'GEDI_biomass_Mg_ha':       ('Model_GEDI_BIOMASS.h5', biomass_features),
}
