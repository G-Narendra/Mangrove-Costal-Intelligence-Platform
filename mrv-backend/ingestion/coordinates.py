import pandas as pd
import ast
import ee
from typing import Tuple, List

from config import IMPUTED_CSV_PATH

def load_mangrove_coordinates() -> Tuple[pd.DataFrame, ee.FeatureCollection]:
    """
    Loads unique mangrove coordinates and their corresponding patch IDs
    from the historical imputed CSV. 
    
    Returns:
        pd.DataFrame: DataFrame containing 'latitude', 'longitude', 'coordinate_str' and 'patch_id'
        ee.FeatureCollection: Earth Engine FeatureCollection of these points for GEE extraction
    """
    # Read only the essential columns to save memory
    df = pd.read_csv(IMPUTED_CSV_PATH, usecols=['coordinate', 'patch_id'])
    
    # Drop NAs before applying string parsing to prevent 'float is not subscriptable' crashes
    df = df.dropna(subset=['coordinate'])
    
    # Drop duplicates to get the unique 3,230 coordinates
    unique_coords_df = df.drop_duplicates(subset=['coordinate']).copy()
    # and split into latitude and longitude columns
    def parse_coord(coord_str):
        if isinstance(coord_str, str):
            try:
                # Safely evaluate the string to a tuple
                return ast.literal_eval(coord_str)
            except:
                # Handle possible float/nan or malformed strings
                coord_str = coord_str.replace('(', '').replace(')', '')
                parts = coord_str.split(',')
                return (float(parts[0]), float(parts[1]))
        return coord_str

    # Apply parsing
    unique_coords_df['coord_tuple'] = unique_coords_df['coordinate'].apply(parse_coord)
    unique_coords_df['latitude'] = unique_coords_df['coord_tuple'].apply(lambda x: x[0])
    unique_coords_df['longitude'] = unique_coords_df['coord_tuple'].apply(lambda x: x[1])
    
    # Keep the original string as a key for Firestore and Merging later
    unique_coords_df.rename(columns={'coordinate': 'coordinate_str'}, inplace=True)
    
    # Drop the temporary tuple column
    unique_coords_df.drop(columns=['coord_tuple'], inplace=True)
    
    # Create Earth Engine FeatureCollection
    features = []
    for index, row in unique_coords_df.iterrows():
        # Earth Engine expects geometry points as [longitude, latitude]
        point = ee.Geometry.Point([row['longitude'], row['latitude']])
        
        # Add patch_id and coordinate_str as properties to the feature
        # so they survive the reduceRegions extraction
        feature = ee.Feature(point, {
            'patch_id': int(row['patch_id']),
            'coordinate_str': row['coordinate_str']
        })
        features.append(feature)
        
    fc = ee.FeatureCollection(features)
    
    return unique_coords_df, fc

if __name__ == "__main__":
    import os
    # For testing: verify coordinates can load
    print(f"Loading from: {IMPUTED_CSV_PATH}")
    if os.path.exists(IMPUTED_CSV_PATH):
        try:
            ee.Initialize()
        except:
            print("EE not initialized. Run ee.Authenticate() if testing locally.")
        else:
            df, fc = load_mangrove_coordinates()
            print(f"Loaded {len(df)} unique coordinates.")
            print(df.head())
            print(f"FeatureCollection size: {fc.size().getInfo()}")
    else:
        print("Data file not found locally. Ensure config paths are correct.")
