import ee
import earthaccess
import time
import datetime

from config import GEE_PROJECT_ID
from .coordinates import load_mangrove_coordinates
from .sentinel1 import extract_s1_data
from .sentinel2 import extract_s2_data
from .gedi import extract_gedi_data

# UAE approx bbox
UAE_BOUNDS = ee.Geometry.Rectangle([51.5, 22.5, 56.5, 26.0])

def check_gee_availability(collection_name: str, start_date: str, end_date: str) -> bool:
    """Checks if a Google Earth Engine collection has images for a date range in the UAE."""
    try:
        ee.Initialize(project=GEE_PROJECT_ID)
    except Exception as e:
        print(f"EE Init Check Error: {e}. Attempting basic auth...")
        ee.Authenticate()
        ee.Initialize(project=GEE_PROJECT_ID)

    collection = ee.ImageCollection(collection_name) \
        .filterDate(start_date, end_date) \
        .filterBounds(UAE_BOUNDS)
    return collection.size().getInfo() > 0

def check_earthdata_availability(short_name: str, start_date: str, end_date: str) -> bool:
    """Checks if an Earthdata collection has granules for a date range in the UAE."""
    try:
        results = earthaccess.search_data(
            short_name=short_name,
            bounding_box=(51.5, 22.5, 56.5, 26.0),
            temporal=(start_date, end_date),
            count=1
        )
        return len(results) > 0
    except:
        return False

def wait_for_data_synchronicity(target_month: str, max_retries: int = 15, retry_interval_hours: int = 24) -> bool:
    """
    The Synchronicity Gate.
    Polls satellites (S1, S2, GEDI) until all have published data covering the UAE for the target month.
    """
    print(f"==== Synchronicity Gate: Checking data for {target_month} ====")
    
    year, month = map(int, target_month.split('-'))
    start_date = datetime.date(year, month, 1).strftime('%Y-%m-%d')
    if month == 12:
        end_date = datetime.date(year + 1, 1, 1).strftime('%Y-%m-%d')
    else:
        end_date = datetime.date(year, month + 1, 1).strftime('%Y-%m-%d')

    for attempt in range(1, max_retries + 1):
        print(f"Attempt {attempt}/{max_retries}...")
        
        # Check S1
        s1_ready = check_gee_availability('COPERNICUS/S1_GRD', start_date, end_date)
        print(f"  Sentinel-1  : {'READY' if s1_ready else 'WAITING'}")
        
        # Check S2
        s2_ready = check_gee_availability('COPERNICUS/S2_SR_HARMONIZED', start_date, end_date)
        print(f"  Sentinel-2  : {'READY' if s2_ready else 'WAITING'}")
        
        # Check GEDI (Earthdata login required)
        gedi_ready = False
        try:
            earthaccess.login(strategy="environment") # Ensure env is set
            gedi_ready = (
                check_earthdata_availability('GEDI02_A', start_date, end_date) and
                check_earthdata_availability('GEDI02_B', start_date, end_date) and
                check_earthdata_availability('GEDI04_A', start_date, end_date)
            )
            print(f"  NASA GEDI   : {'READY' if gedi_ready else 'WAITING'}")
        except Exception as e:
            print(f"  NASA GEDI   : WAITING (Auth/Search error: {e})")
            
        if s1_ready and s2_ready:
            if gedi_ready:
                print("==== ALIGNMENT REACHED: All Data Sources Ready (including GEDI) ====")
            else:
                print("==== ALIGNMENT REACHED: Sentinel Data Ready (Proceeding with Neural Imputation for GEDI) ====")
            return True
            
    print(f"Missing Sentinel data for {target_month}. Satellite publishers have not yet released the archives for this period.")
    return False

def ingest_all(target_month: str):
    """Orchestrates the extraction of all three satellites and merges them."""
    
    # 1. Load the 3,230 coordinate points
    print("Loading Mangrove Coordinates...")
    df_coords, fc_coords = load_mangrove_coordinates()
    
    # 2. Extract S1
    print("\n--- Extracting Sentinel-1 ---")
    df_s1 = extract_s1_data(fc_coords, target_month)
    
    # 3. Extract S2
    print("\n--- Extracting Sentinel-2 ---")
    df_s2 = extract_s2_data(fc_coords, target_month)
    
    # 4. Extract GEDI
    print("\n--- Extracting GEDI (L2A, L2B, L4A) ---")
    df_gedi = extract_gedi_data(df_coords, target_month)
    
    # 5. Merge all together based on coordinate_str
    print("\n--- Merging Data ---")
    # Base dataframe with coordinates and patch IDs
    merged_df = df_coords.copy()
    merged_df['date'] = target_month + "-01"
    
    if not df_s1.empty:
        merged_df = merged_df.merge(df_s1, on='coordinate_str', how='left')
    if not df_s2.empty:
        merged_df = merged_df.merge(df_s2, on='coordinate_str', how='left')
    if not df_gedi.empty:
        merged_df = merged_df.merge(df_gedi, on='coordinate_str', how='left')
        
    # Check results
    print(f"Final ingested shape for {target_month}: {merged_df.shape}")
    return merged_df
