import earthaccess
import h5py
import pandas as pd
import numpy as np
import datetime
import math
import os
import glob
import tempfile
from typing import Dict, List, Any

from config import EARTHDATA_USERNAME, EARTHDATA_PASSWORD

# UAE Bounding Box (roughly covering the mangrove coastal areas)
UAE_BBOX = (51.5, 22.5, 56.5, 26.0) # (min_lon, min_lat, max_lon, max_lat)
DOWNLOAD_DIR = os.path.join(tempfile.gettempdir(), "gedi_mrv_staging")

def init_earthaccess():
    """Authenticates with NASA Earthdata using credentials from env."""
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    try:
        if EARTHDATA_USERNAME and EARTHDATA_PASSWORD:
            print("Authenticating with Earthdata via env vars...")
            earthaccess.login(strategy="environment")
        else:
            print("No env credentials found, attempting interactive/netrc login...")
            earthaccess.login()
        return True
    except Exception as e:
        print(f"Failed to authenticate with Earthdata: {e}")
        return False

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on the earth."""
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1 
    dlon = lon2 - lon1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371 
    return c * r

def process_single_h5(h5_path: str, target_coords: pd.DataFrame, feature_keys: Dict[str, str], 
                      final_dict: Dict[str, Dict], best_dist_dict: Dict[str, float],
                      is_l2a: bool = False):
    """
    Extracts shots from one GEDI H5 file and updates final_dict with the closest match (<= 50m).
    """
    beam_names = ['BEAM0000', 'BEAM0001', 'BEAM0010', 'BEAM0011', 
                  'BEAM0101', 'BEAM0110', 'BEAM1000', 'BEAM1011']
                  
    try:
        with h5py.File(h5_path, 'r') as hf:
            for beam in beam_names:
                if beam not in hf: continue
                
                try:
                    # GEDI H5 files are huge; we only read coordinates first to see if it's worth processing
                    lats = hf[f'{beam}/lat_lowestmode'][:]
                    lons = hf[f'{beam}/lon_lowestmode'][:]
                    
                    # Performance: check if this beam covers the UAE bounds
                    b_min_lat, b_max_lat = lats.min(), lats.max()
                    b_min_lon, b_max_lon = lons.min(), lons.max()
                    
                    tol = 0.002 # ~200m
                    
                    # Filter mangrove points to those potentially in this beam's orbital path
                    possible_mangroves = target_coords[
                        (target_coords['latitude'].between(b_min_lat - tol, b_max_lat + tol)) &
                        (target_coords['longitude'].between(b_min_lon - tol, b_max_lon + tol))
                    ]
                    
                    if possible_mangroves.empty: continue
                    
                    # Now extract features for this beam since it has possible matches
                    feat_arrays = {}
                    if is_l2a:
                        rh_all = hf[f'{beam}/rh'][:] # (N, 101)
                        feat_arrays['GEDI_canopy_height_rh100'] = rh_all[:, 100]
                        feat_arrays['GEDI_canopy_height_rh98'] = rh_all[:, 98]
                        feat_arrays['GEDI_canopy_height_rh92'] = rh_all[:, 92]
                        feat_arrays['GEDI_elevation_lowestmode'] = hf[f'{beam}/elev_lowestmode'][:]
                    else:
                        for target_name, h5_key in feature_keys.items():
                            feat_arrays[target_name] = hf[f'{beam}/{h5_key}'][:]
                    
                    df_beam = pd.DataFrame({'latitude': lats, 'longitude': lons})
                    for k, v in feat_arrays.items():
                        df_beam[k] = np.where(v == -9999, np.nan, v)
                    
                    df_beam.dropna(subset=['latitude', 'longitude'], inplace=True)
                    if df_beam.empty: continue
                    
                    # For each mangrove point, find if any shot in this beam is closer than current best
                    for _, mangrove in possible_mangroves.iterrows():
                        mlat, mlon, coord_str = mangrove['latitude'], mangrove['longitude'], mangrove['coordinate_str']
                        
                        nearby = df_beam[
                            (df_beam['latitude'].between(mlat - tol, mlat + tol)) &
                            (df_beam['longitude'].between(mlon - tol, mlon + tol))
                        ].copy()
                        
                        if nearby.empty: continue
                        
                        nearby['dist'] = nearby.apply(lambda r: haversine(mlat, mlon, r['latitude'], r['longitude']), axis=1)
                        closest = nearby.loc[nearby['dist'].idxmin()]
                        
                        dist = closest['dist']
                        if dist <= 0.05: # 50 meters
                            if dist < best_dist_dict[coord_str]:
                                best_dist_dict[coord_str] = dist
                                for k in feat_arrays.keys():
                                    final_dict[coord_str][k] = closest[k]
                except Exception:
                    continue
    except Exception as e:
        print(f"  Warning: Could not process file {os.path.basename(h5_path)}: {e}")

def run_space_efficient_extraction(dataset_id: str, start_date: str, end_date: str, 
                               target_coords: pd.DataFrame, final_dict: Dict[str, Dict], 
                               feature_keys: Dict[str, str], is_l2a: bool = False):
    """Searches, downloads one-by-one, processes, and deletes GEDI granules."""
    print(f"Searching {dataset_id} granules for {start_date} to {end_date}...")
    try:
        results = earthaccess.search_data(
            short_name=dataset_id,
            bounding_box=UAE_BBOX,
            temporal=(start_date, end_date),
            count=100 
        )
    except Exception as e:
        print(f"  Warning: Earthdata search failed for {dataset_id}: {e}")
        return
    
    if not results:
        print(f"  No granules found for {dataset_id}")
        return

    print(f"  Found {len(results)} granules. Processing one-by-one to save disk space...")
    
    # Track best distance per coordinate for THIS product (some might overlap)
    best_dists = {row['coordinate_str']: 999.0 for _, row in target_coords.iterrows()}
    
    for i, granule in enumerate(results):
        try:
            filename = granule['meta']['native-id']
            print(f"  [{i+1}/{len(results)}] Downloading {filename}...")
            # download returns a list of paths
            h5_path = None
            downloaded = earthaccess.download([granule], DOWNLOAD_DIR)
            if not downloaded: continue
            
            h5_path = downloaded[0]
            
            process_single_h5(h5_path, target_coords, feature_keys, final_dict, best_dists, is_l2a)
            
        except Exception as e:
            print(f"  Error on granule {i+1}: {e}")
            
        finally:
            # Delete immediately, guaranteed, even if extraction crashes
            if h5_path and os.path.exists(h5_path):
                try:
                    os.remove(h5_path)
                except Exception as cleanup_err:
                    print(f"  Warning: Could not delete temp file {h5_path}: {cleanup_err}")

def extract_gedi_data(target_coords: pd.DataFrame, target_month: str) -> pd.DataFrame:
    """
    Space-efficient extraction of GEDI L2A, L2B, and L4A data.
    Downloads, processes, and deletes granules one-at-a-time.
    """
    if not init_earthaccess():
        return pd.DataFrame()
        
    print(f"Initializing Space-Efficient GEDI extraction for {target_month}")
    year, month = map(int, target_month.split('-'))
    start_date = datetime.date(year, month, 1).strftime('%Y-%m-%d')
    end_date = (datetime.date(year, month, 1) + datetime.timedelta(days=31)).replace(day=1).strftime('%Y-%m-%d')
    
    # Result container: {coordinate_str: {feature: value, ...}}
    final_dict = {row['coordinate_str']: {'coordinate_str': row['coordinate_str']} for _, row in target_coords.iterrows()}
    
    # 1. GEDI L2A (Height / Elevation)
    l2a_features = {'rh': 'rh', 'elev_lowestmode': 'elev_lowestmode'} # keys used inside process_single_h5 specifically for l2a
    run_space_efficient_extraction('GEDI02_A', start_date, end_date, target_coords, final_dict, l2a_features, is_l2a=True)
    
    # 2. GEDI L2B (PAI, FHD, FCOVER)
    l2b_keys = {'GEDI_PAI': 'pai', 'GEDI_FHD': 'fhd_normal', 'GEDI_FCOVER': 'cover'}
    run_space_efficient_extraction('GEDI02_B', start_date, end_date, target_coords, final_dict, l2b_keys)
    
    # 3. GEDI L4A (Biomass)
    l4a_keys = {'GEDI_biomass_Mg_ha': 'agbd'}
    run_space_efficient_extraction('GEDI04_A', start_date, end_date, target_coords, final_dict, l4a_keys)

    # Convert to DataFrame
    df_final = pd.DataFrame(list(final_dict.values()))
    
    # Ensure all columns exist even if no data found
    expected_cols = [
        'GEDI_canopy_height_rh100', 'GEDI_canopy_height_rh98', 'GEDI_canopy_height_rh92',
        'GEDI_elevation_lowestmode', 'GEDI_PAI', 'GEDI_FHD', 'GEDI_FCOVER', 'GEDI_biomass_Mg_ha'
    ]
    for col in expected_cols:
        if col not in df_final.columns:
            df_final[col] = np.nan
            
    print(f"GEDI extraction complete. Yielded {len(df_final.dropna(thresh=2))} matched records.")
    return df_final
