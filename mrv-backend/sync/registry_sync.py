import pandas as pd
from datetime import datetime, timezone, date
from dateutil.relativedelta import relativedelta
from typing import List, Dict, Any

from .firestore_client import get_db

from .alert_engine import process_deviations

MCIP_COLLECTION = 'MCIP_Carbon_Register'
UAE_COLLECTION = 'UAE_Verified_Carbon_Register'

def calculate_uncertainty(status: str, forecast_gap_months: int) -> float:
    """
    Tiered Linear Expansion Uncertainty Model:
    - Verified: 2% (Historical audit)
    - Active (Month 0): 5% (Real-time monitoring)
    - Near-Term (Months 1-5): 8% to 12% (Linear +1% per month)
    - Long-Term (Months 6-11): 15% to 25% (Linear +2% per month)
    """
    if status == 'Verified':
        return 0.02
    
    if forecast_gap_months == 0:
        return 0.05
    elif 1 <= forecast_gap_months <= 5:
        # 0.08, 0.09, 0.10, 0.11, 0.12
        return 0.08 + (forecast_gap_months - 1) * 0.01
    else:
        # 6 -> 0.15, 7 -> 0.17, ... 11 -> 0.25
        return 0.15 + (forecast_gap_months - 6) * 0.02

def upload_registry_records(df: pd.DataFrame, target_month: str, forecast_months: int = 12):
    """
    Synchronizes processed data to the MCIP and UAE National Carbon Registers.
    Consumes the 12-month 'forecast_sequence' from STGNN for dynamic future mapping.
    """
    print(f"Starting Intelligent Registry synchronization for {target_month}...")
    db = get_db()
    
    # 1. Parse dates
    year, month = map(int, target_month.split('-'))
    start_date_obj = date(year, month, 1)
    
    # Threshold for verified history (Provided by user: JAN 2026)
    history_threshold = date(2026, 1, 31)
    
    df_valid = df[df['patch_id'] != -1].copy()
    grouped = df_valid.groupby('patch_id')
    current_timestamp = datetime.now(timezone.utc).isoformat()
    
    batch = db.batch()
    op_count = 0
    batch_size = 500
    
    for patch_id, group in grouped:
        patch_str = f"Patch_{int(patch_id)}"
        
        # Calculate current metrics
        current_abs = 0.0
        if 'monthly_absorption_tCO2e_ha' in group.columns:
            current_abs = float(group['monthly_absorption_tCO2e_ha'].sum())
            
        # 12-Month Dynamic Forecast Sequence (from STGNN)
        # Default to a flat list if sequence is missing
        forecast_seq = [current_abs] * 12
        if 'forecast_sequence' in group.columns:
            # Take the list from the first row of the group
            raw_seq = group['forecast_sequence'].iloc[0]
            if isinstance(raw_seq, list) and len(raw_seq) >= 12:
                forecast_seq = raw_seq
            
        # 2. Iterate through months (Current + Requested Forecasts)
        for i in range(forecast_months):
            record_date = start_date_obj + relativedelta(months=i)
            date_id = record_date.strftime('%Y-%m')
            
            # Determine status based on actual dates relative to March 2026
            if record_date <= history_threshold:
                status = 'Verified'
            elif record_date.year == 2026 and record_date.month == 2:
                status = 'Active'
            else:
                status = 'Pending'
            
            # Determine absorption and uncertainty
            # If it's the current month (i==0), use real computed data (current_abs)
            # Otherwise use the i-th prediction from the STGNN sequence
            abs_val = current_abs if i == 0 else float(forecast_seq[i])
            uncert = calculate_uncertainty(status, i)
            
            # --- SENTINEL ALERT ENGINE ---
            if i == 0:
                # Compare actual with previous forecast before overwriting
                process_deviations(patch_str, date_id, abs_val, uncert)
            
            record = {
                'id': f"{patch_str}_{date_id}",
                'patchId': patch_str,
                'dateId': date_id,
                'carbonAmount': abs_val,
                'uncertainty': uncert,
                'isForecast': i > 0,
                'registryDate': current_timestamp,
                'status': status,
                'verraStatus': 'Verified' if status == 'Verified' else 'Pending'
            }
            
            # --- WRITE TO MCIP REGISTER ---
            doc_ref = db.collection(MCIP_COLLECTION).document(record['id'])
            batch.set(doc_ref, record)
            op_count += 1
            
            # --- WRITE TO UAE NATIONAL REGISTER (Only if Verified) ---
            if status == 'Verified':
                uae_ref = db.collection(UAE_COLLECTION).document(record['id'])
                batch.set(uae_ref, record)
                uae_op_count = 1
                op_count += 1
                
            if op_count >= batch_size:
                try:
                    batch.commit()
                except Exception as e:
                    if "429" in str(e) or "Quota exceeded" in str(e) or "ResourceExhausted" in str(e):
                        print("Warning: Firestore Quota Exceeded on batch commit. Stopping registry sync.")
                        return
                    raise e
                batch = db.batch()
                op_count = 0
                
    if op_count > 0:
        try:
            batch.commit()
        except Exception as e:
            if "429" in str(e) or "Quota exceeded" in str(e) or "ResourceExhausted" in str(e):
                print("Warning: Firestore Quota Exceeded on final batch commit. Stopping registry sync.")
                return
            raise e
    
    print(f"Registry synchronization complete. Updated {MCIP_COLLECTION} and {UAE_COLLECTION}.")
