import ee
import pandas as pd
import datetime
from typing import List, Dict

from config import GEE_PROJECT_ID

def apply_s1_speckle_filter(image: ee.Image) -> ee.Image:
    """Applies a focal median 3x3 filter to reduce radar speckle."""
    filtered_image = image.focal_median(radius=3)
    return filtered_image.copyProperties(image, image.propertyNames())

def fetch_features_in_chunks(feature_collection: ee.FeatureCollection, 
                             image: ee.Image, 
                             chunk_size: int = 250) -> List[Dict]:
    """
    Extracts underlying image pixel values for a collection of points, processing in chunks 
    to avoid Earth Engine memory/timeout errors.
    """
    total_features = feature_collection.size().getInfo()
    all_extracted_features = []
    
    # print(f"Processing {total_features} features in chunks of {chunk_size}...")
    
    for i in range(0, total_features, chunk_size):
        end_index = min(i + chunk_size, total_features)
        
        # Convert List back to FeatureCollection
        current_chunk_list = feature_collection.toList(end_index).slice(i, end_index)
        current_chunk_fc = ee.FeatureCollection(current_chunk_list)
        
        # Apply reduceRegions
        chunk_features = image.reduceRegions(
            reducer=ee.Reducer.first(),
            collection=current_chunk_fc,
            scale=10 # S1 spatial resolution is 10m
        )
        
        try:
            # Execute the EE query and fetch results to local machine
            chunk_list = chunk_features.getInfo()['features']
            all_extracted_features.extend(chunk_list)
        except Exception as e:
            print(f"Error fetching chunk {i}-{end_index}: {e}")
            
    return all_extracted_features

def extract_s1_data(fc: ee.FeatureCollection, target_month: str) -> pd.DataFrame:
    """
    Extracts VV and VH backscatter and coherence for a specific month.
    
    Args:
        fc: Earth Engine FeatureCollection containing mangrove coordinates
        target_month: String in 'YYYY-MM' format
        
    Returns:
        pd.DataFrame containing 'coordinate_str', 'VV_backscatter', 'VH_backscatter', 
        'VV_coherence', 'VH_coherence'
    """
    try:
        ee.Initialize(project=GEE_PROJECT_ID)
    except Exception as e:
        print(f"EE Init S1 Error: {e}. Attempting basic auth...")
        ee.Authenticate()
        ee.Initialize(project=GEE_PROJECT_ID)

    print(f"Initializing Sentinel-1 extraction for {target_month}")
    
    # Define date range for the target month
    year, month = map(int, target_month.split('-'))
    start_date = datetime.date(year, month, 1).strftime('%Y-%m-%d')
    # Use 1st of next month as end_date (exclusive in EE filtering)
    if month == 12:
        end_date = datetime.date(year + 1, 1, 1).strftime('%Y-%m-%d')
    else:
        end_date = datetime.date(year, month + 1, 1).strftime('%Y-%m-%d')

    # Load S1 Backscatter ImageCollection
    s1_backscatter = ee.ImageCollection('COPERNICUS/S1_GRD') \
        .filterDate(start_date, end_date) \
        .filterBounds(fc) \
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')) \
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH')) \
        .filter(ee.Filter.eq('instrumentMode', 'IW')) \
        .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING')) \
        .filter(ee.Filter.eq('productType', 'GRD'))
        
    print(f"S1 Backscatter images found: {s1_backscatter.size().getInfo()}")
    
    # Apply speckle filter and create monthly median composite
    s1_bs_filtered = s1_backscatter.map(apply_s1_speckle_filter)
    median_bs = s1_bs_filtered.median().select(['VV', 'VH'])
    
    print("Extracting S1 Backscatter...")
    bs_features = fetch_features_in_chunks(fc, median_bs)

    # Load S1 Coherence ImageCollection
    s1_coherence = ee.ImageCollection('COPERNICUS/S1_GRD_FLOAT') \
        .filterDate(start_date, end_date) \
        .filterBounds(fc) \
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')) \
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH')) \
        .filter(ee.Filter.eq('instrumentMode', 'IW')) \
        .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
        
    print(f"S1 Coherence images found: {s1_coherence.size().getInfo()}")
    
    s1_coh_filtered = s1_coherence.map(apply_s1_speckle_filter)
    median_coh = s1_coh_filtered.median().select(['VV', 'VH'])
    
    print("Extracting S1 Coherence...")
    coh_features = fetch_features_in_chunks(fc, median_coh)
    
    # Combine results into DataFrame
    # Using 'coordinate_str' as the unique key to join everything
    results = []
    
    # Process backscatter
    bs_dict = {}
    for f in bs_features:
        props = f['properties']
        coord = props.get('coordinate_str')
        bs_dict[coord] = {
            'VV_backscatter': props.get('VV'),
            'VH_backscatter': props.get('VH')
        }
        
    # Process coherence
    coh_dict = {}
    for f in coh_features:
        props = f['properties']
        coord = props.get('coordinate_str')
        coh_dict[coord] = {
            'VV_coherence': props.get('VV'),
            'VH_coherence': props.get('VH')
        }
        
    # Merge and build final list
    for coord in bs_dict.keys():
        row = {'coordinate_str': coord}
        row.update(bs_dict.get(coord, {'VV_backscatter': None, 'VH_backscatter': None}))
        row.update(coh_dict.get(coord, {'VV_coherence': None, 'VH_coherence': None}))
        results.append(row)
        
    df = pd.DataFrame(results)
    print(f"S1 Extraction complete. Extracted {len(df)} records.")
    return df
