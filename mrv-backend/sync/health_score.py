import pandas as pd
from typing import Dict

from .firestore_client import get_db

def calculate_and_upload_health_score(df: pd.DataFrame, target_month: str):
    """
    Calculates the Mangrove Health Score (MHS) for each patch based on:
    - NDVI (Vegetation Density)
    - rh100 (Canopy Height / Structural Integrity)
    - Total Absorption (Carbon metric)
    
    Updates the existing TimeSeries documents with this computed metric.
    """
    print(f"Calculating and uploading health scores for {target_month}...")
    db = get_db()
    
    year, month = map(int, target_month.split('-'))
    date_doc_id = f"{year:04d}-{month:02d}"
    
    df_valid = df[df['patch_id'] != -1].copy()
    grouped = df_valid.groupby('patch_id')
    
    batch = db.batch()
    operations_count = 0
    batch_size = 500
    
    for patch_id, group in grouped:
        try:
            # 1. Calculate Patch Averages
            avg_ndvi = float(group['NDVI'].mean()) if 'NDVI' in group.columns else 0.0
            avg_rh100 = float(group['GEDI_canopy_height_rh100'].mean()) if 'GEDI_canopy_height_rh100' in group.columns else 0.0
            
            # 2. Total Absorption
            total_abs = float(group['monthly_absorption_tCO2e_ha'].sum()) if 'monthly_absorption_tCO2e_ha' in group.columns else 0.0
            
            # 3. Simple MHS Formula (Matches STAGE_4 cell 24 logic conceptually)
            # Normalize elements conceptually or just weight them. 
            # In STAGE_4 it was a weighted sum, for example:
            # Score = (NDVI * 40) + (rh100_normalized * 30) + (absorption_normalized * 30)
            # Without historical min/max, we do a relative point calculation
            
            # Simple heuristic scaling for demonstration
            # NDVI is 0-1, multiply by 40 to push to 40 max points
            ndvi_score = max(0, min(40, avg_ndvi * 40))
            
            # rh100 usually 2m-10m. Assume 10m is max score (30 points)
            rh_score = max(0, min(30, (avg_rh100 / 10.0) * 30))
            
            # Absorption, assume 15 tCO2 is a good max patch (30 points)
            abs_score = max(0, min(30, (total_abs / 15.0) * 30))
            
            final_health_score = ndvi_score + rh_score + abs_score
            
            # 4. Update Firestore
            patch_ref = db.collection('Patches').document(f"Patch_{int(patch_id)}")
            ts_ref = patch_ref.collection('TimeSeries').document(date_doc_id)
            
            # We use merge=True so we don't overwrite the mangrove_pixels we just synced
            batch.set(ts_ref, {"health_score": final_health_score}, merge=True)
            operations_count += 1
            
            if operations_count % batch_size == 0:
                batch.commit()
                batch = db.batch()
                
        except Exception as e:
            print(f"Error computing health score for Patch_{patch_id}: {e}")
            
    if operations_count % batch_size != 0:
        batch.commit()
        
    print(f"Successfully synced {operations_count} health scores.")
