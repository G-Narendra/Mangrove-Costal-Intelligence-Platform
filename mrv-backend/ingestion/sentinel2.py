import ee
import pandas as pd
import datetime
import math
from typing import List, Dict

from config import GEE_PROJECT_ID

from .sentinel1 import fetch_features_in_chunks

def mask_s2_clouds_and_shadows(image: ee.Image) -> ee.Image:
    """Masks clouds and cloud shadows using the Scene Classification Layer (SCL)."""
    scl = image.select('SCL')
    # SCL Classes: 3 = Cloud Shadows, 8 = Cloud Medium Probability, 9 = Cloud High Probability, 10 = Thin Cirrus
    cloud_shadow_bitMask = (1 << 3)
    clouds_bitMask = (1 << 8) | (1 << 9) | (1 << 10)
    
    # Pixels where SCL is NOT one of these classes are kept
    mask = scl.bitwiseAnd(cloud_shadow_bitMask).eq(0) \
        .And(scl.bitwiseAnd(clouds_bitMask).eq(0))
        
    return image.updateMask(mask).copyProperties(image, image.propertyNames())

def add_s2_indices(image: ee.Image) -> ee.Image:
    """Adds various spectral indices to the image."""
    # Ensure values are floats to prevent integer division issues
    img_float = image.cast({'B2': 'float', 'B3': 'float', 'B4': 'float', 'B8': 'float', 'B11': 'float', 'B12': 'float'})

    ndvi = img_float.normalizedDifference(['B8', 'B4']).rename('NDVI')
    ndwi = img_float.normalizedDifference(['B3', 'B8']).rename('NDWI')
    ndsi = img_float.normalizedDifference(['B3', 'B11']).rename('NDSI')
    
    # Moisture index = (B8A - B11) / (B8A + B11)
    b8a = img_float.select('B8A')
    b11 = img_float.select('B11')
    moisture = b8a.subtract(b11).divide(b8a.add(b11)).rename('Moisture_index')
    
    SWIR = img_float.select('B11').rename('SWIR')
    scene_classification_map = image.select('SCL').rename('Scene_classification_map')
    false_color = img_float.select('B8').rename('False_color')
    false_color_urban = img_float.select('B12').rename('False_color_urban')
    highlight_optimized_natural_color = img_float.select('B4').rename('Highlight_Optimized_Natural_Color')
    true_color = img_float.select('B4').rename('True_color')

    return image.addBands([
        ndvi, ndwi, ndsi, moisture, SWIR, 
        scene_classification_map, false_color, false_color_urban,
        highlight_optimized_natural_color, true_color
    ])

def extract_s2_data(fc: ee.FeatureCollection, target_month: str) -> pd.DataFrame:
    """
    Extracts Sentinel-2 spectral bands and calculated indices for a specific month.
    
    Args:
        fc: Earth Engine FeatureCollection containing mangrove coordinates
        target_month: String in 'YYYY-MM' format
        
    Returns:
        pd.DataFrame containing 'coordinate_str' and 23 Sentinel-2 features
    """
    try:
        ee.Initialize(project=GEE_PROJECT_ID)
    except Exception as e:
        print(f"EE Init S2 Error: {e}. Attempting basic auth...")
        ee.Authenticate()
        ee.Initialize(project=GEE_PROJECT_ID)

    print(f"Initializing Sentinel-2 extraction for {target_month}")
    
    # Define date range for the target month
    year, month = map(int, target_month.split('-'))
    start_date = datetime.date(year, month, 1).strftime('%Y-%m-%d')
    if month == 12:
        end_date = datetime.date(year + 1, 1, 1).strftime('%Y-%m-%d')
    else:
        end_date = datetime.date(year, month + 1, 1).strftime('%Y-%m-%d')

    # Load S2 Surface Reflectance (Harmonized) Collection
    s2_collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
        .filterDate(start_date, end_date) \
        .filterBounds(fc) \
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) \
        .map(mask_s2_clouds_and_shadows) \
        .map(add_s2_indices)
        
    print(f"S2 Minimal Cloud images found: {s2_collection.size().getInfo()}")
    
    # Create monthly median composite
    # Select all standard bands (12) + computed indices (10) + SCL (1) = 23 features
    bands_to_select = [
        'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B11', 'B12', 'SCL',
        'NDVI', 'NDWI', 'NDSI', 'Moisture_index', 'SWIR', 
        'Scene_classification_map', 'False_color', 'False_color_urban', 
        'Highlight_Optimized_Natural_Color', 'True_color'
    ]
    median_s2 = s2_collection.median().select(bands_to_select)
    
    print("Extracting S2 features (this may take a moment)...")
    s2_features = fetch_features_in_chunks(fc, median_s2)
    
    # Format into DataFrame
    results = []
    for f in s2_features:
        props = f['properties']
        coord = props.get('coordinate_str')
        
        row = {'coordinate_str': coord}
        for band in bands_to_select:
            row[band] = props.get(band)
            
        results.append(row)
        
    df = pd.DataFrame(results)
    print(f"S2 Extraction complete. Extracted {len(df)} records.")
    return df
