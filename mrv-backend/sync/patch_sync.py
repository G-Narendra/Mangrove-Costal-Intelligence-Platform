import pandas as pd
from datetime import datetime, timezone
from typing import Dict, Any

from .firestore_client import get_db

def upload_patch_timeseries(df: pd.DataFrame, target_month: str):
    """
    Uploads processed monthly data to Firestore.
    Structure: Patches (Col) -> Patch_{id} (Doc) -> TimeSeries (Col) -> {YYYY-MM} (Doc)
    
    Args:
        df: Fully processed DataFrame containing 'patch_id', 'coordinate_str', 
            and all features (S1, S2, GEDI, Carbon metrics).
        target_month: E.g. '2026-02'
    """
    print(f"Starting Firestore Patch/TimeSeries synchronization for {target_month}...")
    db = get_db()
    
    # Standardize to YYYY-MM explicitly
    year, month = map(int, target_month.split('-'))
    date_doc_id = f"{year:04d}-{month:02d}"
    
    if 'patch_id' not in df.columns:
        print("Error: No patch_id found in dataframe. Skipping upload.")
        return
        
    df_valid = df[df['patch_id'] != -1].copy()
    df_valid['patch_id'] = df_valid['patch_id'].astype(int)
    
    grouped = df_valid.groupby('patch_id')
    total_patches = len(grouped)
    uploaded = 0
    
    for patch_id, group in grouped:
        try:
            patch_ref = db.collection('Patches').document(f"Patch_{patch_id}")
            ts_ref = patch_ref.collection('TimeSeries').document(date_doc_id)
            
            total_monthly_absorption = 0.0
            total_forecast = 0.0
            
            # Use sum() over the group directly for patch-level metrics
            if 'monthly_absorption_tCO2e_ha' in group.columns:
                total_monthly_absorption = float(group['monthly_absorption_tCO2e_ha'].sum())
            if 'forecast_absorption_tCO2e_ha' in group.columns:
                total_forecast = float(group['forecast_absorption_tCO2e_ha'].mean())
            
            # 1. Update the metadata document (Patch-level)
            doc_data = {
                'total_absorption_tCO2e_ha': total_monthly_absorption,
                'forecast_absorption_tCO2e_ha': total_forecast if pd.notna(total_forecast) else None,
                'average_NDVI': float(group['NDVI'].mean()) if 'NDVI' in group.columns else 0.0,
                'average_GEDI_canopy_height_rh100': float(group['GEDI_canopy_height_rh100'].mean()) if 'GEDI_canopy_height_rh100' in group.columns else 0.0,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            doc_data = {k: v for k, v in doc_data.items() if v is not None}
            ts_ref.set(doc_data, merge=True)

            # 2. Update Pixel sub-collection (One document per pixel to stay under 1MB)
            pixel_col = ts_ref.collection('Pixels')
            batch = db.batch()
            for _, row in group.iterrows():
                coord_str = str(row['coordinate_str'])
                coord_key = coord_str.replace('.', '_').replace('/', '-').replace(' ', '')
                
                exclude_cols = ['coordinate_str', 'date', 'patch_id']
                features = {k: float(v) if pd.notna(v) else None 
                            for k, v in row.drop(exclude_cols, errors='ignore').to_dict().items()}
                
                pixel_ref = pixel_col.document(coord_key)
                batch.set(pixel_ref, features)
                
            batch.commit()
            uploaded += 1
            if uploaded % 10 == 0:
                print(f"  Uploaded {uploaded}/{total_patches} patches...")
                
        except Exception as e:
            print(f"Error uploading Patch_{patch_id} for {date_doc_id}: {e}")
            
    print(f"Successfully synchronized {uploaded}/{total_patches} patches to Firestore.")
