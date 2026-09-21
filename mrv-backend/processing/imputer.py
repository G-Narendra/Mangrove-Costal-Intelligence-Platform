import pandas as pd
import numpy as np
import os
from tensorflow.keras.models import load_model

from config import MODELS_DIR, MODELS_CONFIG

def impute_missing_gedi(df: pd.DataFrame) -> pd.DataFrame:
    """
    Finds rows missing GEDI features and uses the pre-trained Regressive 
    Neural Network models to predict them using S1/S2 data.
    """
    df_imputed = df.copy()
    print("Initializing Neural Imputation Engine...")
    
    # Check if models directory exists
    if not os.path.exists(MODELS_DIR):
        print(f"Warning: Models directory '{MODELS_DIR}' not found. Cannot impute.")
        return df_imputed
        
    for target_col, (model_filename, feature_cols) in MODELS_CONFIG.items():
        print(f"Imputing {target_col}...")
        model_path = os.path.join(MODELS_DIR, model_filename)
        
        if not os.path.exists(model_path):
            print(f"  Warning: Model {model_filename} not found. Skipping {target_col}.")
            continue
            
        # Ensure target column exists in dataframe, create with NaN if not
        if target_col not in df_imputed.columns:
            df_imputed[target_col] = np.nan
            
        # Ensure all required feature columns exist
        missing_features = [col for col in feature_cols if col not in df_imputed.columns]
        if missing_features:
            print(f"  Warning: Missing input features {missing_features} for {target_col}. Skipping.")
            continue
            
        try:
            # Determine rows that need imputation (where target is NaN)
            mask_missing = df_imputed[target_col].isna()
            
            # Additional check: we can only predict if the input features are NOT NaN
            # (e.g., S1/S2 were successfully extracted)
            mask_valid_inputs = df_imputed[feature_cols].notna().all(axis=1)
            
            mask_to_predict = mask_missing & mask_valid_inputs
            
            if not mask_to_predict.any():
                print(f"  No missing values valid for imputation for {target_col}.")
                continue
                
            print(f"  Found {mask_to_predict.sum()} rows needing imputation.")
            
            # Load model and predict
            model = load_model(model_path)
            X_predict = df_imputed.loc[mask_to_predict, feature_cols].values
            
            if len(X_predict) > 0:
                predictions = model.predict(X_predict, verbose=0)
                # Ensure predictions are flat
                predictions = predictions.flatten() 
                
                # Assign back to dataframe
                df_imputed.loc[mask_to_predict, target_col] = predictions
                print(f"  Successfully imputed {len(predictions)} values for {target_col}.")
                
        except Exception as e:
            print(f"  Error imputing {target_col} with {model_filename}: {e}")
            
    # Apply structural constraints / logic checks if needed
    # (e.g., FCOVER should be between 0 and 1)
    if 'GEDI_FCOVER' in df_imputed.columns:
        df_imputed['GEDI_FCOVER'] = df_imputed['GEDI_FCOVER'].clip(0.0, 1.0)
    
    # (PAI and Biomass should be non-negative)
    for target in ['GEDI_PAI', 'GEDI_biomass_Mg_ha']:
        if target in df_imputed.columns:
            df_imputed[target] = df_imputed[target].clip(lower=0.0)
            
    print("Neural Imputation Complete.")
    return df_imputed
