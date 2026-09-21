import pandas as pd
import os

from config import IMPUTED_CSV_PATH, GRAPH_EDGES_PATH
from .imputer import impute_missing_gedi
from .carbon import calculate_carbon_metrics
from .stgnn import predict_future_carbon

def run_processing_pipeline(ingested_df: pd.DataFrame, target_month: str) -> pd.DataFrame:
    """
    Orchestrates the neural imputation and carbon calculation for a newly ingested month.
    
    Args:
        ingested_df: DataFrame containing raw S1, S2, and GEDI extractions
        target_month: E.g. '2026-02'
        
    Returns:
        pd.DataFrame fully processed and ready for Firestore syncing.
    """
    print(f"\n==== Starting Processing Pipeline for {target_month} ====")
    
    # 1. Provide default connectivity counts if they are not extracted
    # (Since these are static across time, we load from the historical CSV or graph edges)
    # For now, if missing:
    conn_cols = [
        'num_sedimental_outgoing', 'num_sedimental_incoming',
        'num_tidal_outgoing', 'num_tidal_incoming',
        'total_sedimental_connections', 'total_tidal_connections'
    ]
    
    # Look up static node connectivity properties from old CSV based on patch_id
    if os.path.exists(IMPUTED_CSV_PATH):
        try:
            # First, check which columns actually exist in the CSV
            available_cols = pd.read_csv(IMPUTED_CSV_PATH, nrows=0).columns.tolist()
            cols_to_load = ['patch_id'] + [c for c in conn_cols if c in available_cols]
            
            hist_df = pd.read_csv(IMPUTED_CSV_PATH, usecols=cols_to_load).drop_duplicates(subset=['patch_id'])
            
            # Remove existing conn columns in ingested_df before merging
            ingested_df = ingested_df.drop(columns=[c for c in conn_cols if c in ingested_df.columns], errors='ignore')
            ingested_df = ingested_df.merge(hist_df, on='patch_id', how='left')
        except Exception as e:
            print(f"Warning: Could not load connectivity columns from historical CSV: {e}")
    
    # Fill any NaNs or missing columns with 0
    for c in conn_cols:
        if c not in ingested_df.columns:
            ingested_df[c] = 0.0
        ingested_df[c] = ingested_df[c].fillna(0.0)
    
    # 2. Impute missing GEDI
    processed_df = impute_missing_gedi(ingested_df)
    
    # 3. Calculate Carbon Metrics
    # First, get the global PAI mean from historical data for normalization
    global_pai_mean = processed_df['GEDI_PAI'].mean()
    if os.path.exists(IMPUTED_CSV_PATH):
        try:
            hist_pai = pd.read_csv(IMPUTED_CSV_PATH, usecols=['GEDI_PAI'])
            historical_mean = hist_pai['GEDI_PAI'].mean()
            if not pd.isna(historical_mean):
                global_pai_mean = historical_mean
        except Exception:
            pass
            
    processed_df = calculate_carbon_metrics(processed_df, global_pai_mean)
    
    # 4. Spatio-Temporal Prediction (STGNN)
    if os.path.exists(IMPUTED_CSV_PATH):
        try:
            # We only need the last 2 months for the 3-look-back (including current)
            historic_df = pd.read_csv(IMPUTED_CSV_PATH)
            historic_df['date'] = pd.to_datetime(historic_df['date'])
            processed_df = predict_future_carbon(historic_df, processed_df)
        except Exception as e:
            print(f"Warning: Could not run STGNN due to historical data read error: {e}")
            
    print(f"==== Processing Complete for {target_month} ====")
    return processed_df
