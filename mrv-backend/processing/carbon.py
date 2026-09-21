import pandas as pd
from config import CARBON_FRACTION, CO2_TO_C_RATIO, ANNUAL_BASE_SEQ_RATE

def calculate_carbon_metrics(df: pd.DataFrame, global_pai_mean: float) -> pd.DataFrame:
    """
    Applies IPCC-compliant conversion factors to compute carbon stock and
    monthly sequestration rates based on GEDI biomass and PAI structure weights.
    
    Args:
        df: DataFrame containing 'GEDI_biomass_Mg_ha' and 'GEDI_PAI'
        global_pai_mean: The historical mean PAI value used to standardize the structure weight
        
    Returns:
        DataFrame with new columns:
        - carbon_stock_MgC_ha
        - carbon_stock_tCO2e_ha
        - monthly_absorption_MgC_ha
        - monthly_absorption_tCO2e_ha
    """
    print("Calculating IPCC-compliant carbon metrics...")
    df_calc = df.copy()
    
    # Safeguard if required columns are somehow missing
    required = ['GEDI_biomass_Mg_ha', 'GEDI_PAI']
    missing = [col for col in required if col not in df_calc.columns]
    if missing:
        print(f"Warning: Missing columns {missing} for carbon calculation.")
        return df_calc
        
    # Carbon Stock Calculation
    # Convert Above Ground Biomass (Dry Matter) to Carbon Content
    df_calc['carbon_stock_MgC_ha'] = df_calc['GEDI_biomass_Mg_ha'] * CARBON_FRACTION
    
    # Convert element Carbon to CO2 equivalent (44g/mol CO2 / 12g/mol C)
    df_calc['carbon_stock_tCO2e_ha'] = df_calc['carbon_stock_MgC_ha'] * CO2_TO_C_RATIO
    
    # Monthly Absorption Calculation
    # We use PAI (Plant Area Index) as a proxy for structural complexity/photosynthetic capcity
    # Weighting current PAI against the global historical mean
    structure_weight = df_calc['GEDI_PAI'] / global_pai_mean
    
    # Base annual rate distributed monthly, scaled by structural proxy
    df_calc['monthly_absorption_MgC_ha'] = (ANNUAL_BASE_SEQ_RATE * structure_weight) / 12.0
    
    # Convert monthly C rate to CO2e rate
    df_calc['monthly_absorption_tCO2e_ha'] = df_calc['monthly_absorption_MgC_ha'] * CO2_TO_C_RATIO
    
    print("Carbon metrics calculation complete.")
    return df_calc
