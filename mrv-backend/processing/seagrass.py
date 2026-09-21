import ee
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Earth Engine and Firestore
# Initialize with your specific Project ID
ee.Initialize(project='mangroove-startup')
db = firestore.client()

def get_seagrass_connectivity_2023(lat, lon):
    point = ee.Geometry.Point([lon, lat])
    
    # 1. Tidal Connectivity (Using Global Tide Models or Bathymetry as proxy)
    # Higher resolution bathymetry often dictates tidal flow
    bathymetry = ee.Image("MERIT/Bathymetry/V1").reduceRegion(
        reducer=ee.Reducer.mean(), geometry=point, scale=30).get('bathymetry')

    # 2. Sediment Connectivity (Using MODIS Terra Suspended Sediment)
    sediment = ee.ImageCollection("MODIS/061/MOD09GQ") \
        .filterDate('2023-01-01', '2023-12-31') \
        .median().reduceRegion(
            reducer=ee.Reducer.mean(), geometry=point, scale=250).get('sur_refl_b01')

    # 3. Socio-Economic Data (Using Global Human Footprint/Infrastructure layers)
    # Fishing Routes & Community Corridors are often proxied by Human Influence Index
    human_impact = ee.Image("CSP/ERGo/1_0/Global/HumanModification").reduceRegion(
        reducer=ee.Reducer.mean(), geometry=point, scale=1000).get('gHM')

    return {
        "tidal_connectivity": float(ee.Number(bathymetry).getInfo() or 0),
        "sediment_connectivity": float(ee.Number(sediment).getInfo() or 0),
        "socio_economic_impact": float(ee.Number(human_impact).getInfo() or 0),
        "year": 2023
    }

# Update a Seagrass Patch in Firestore
def update_seagrass_patch(patch_id, lat, lon):
    data = get_seagrass_connectivity_2023(lat, lon)
    
    # Save to a new 'seagrass_patches' collection
    db.collection('seagrass_patches').document(patch_id).set({
        'location': firestore.GeoPoint(lat, lon),
        'connectivity_data': {
            'tidal': data['tidal_connectivity'],
            'sediment': data['sediment_connectivity']
        },
        'socio_economic': {
            'impact_index': data['socio_economic_impact'],
            'status': 'verified'
        },
        'last_updated': '2023-12-31'
    }, merge=True)
    print(f"Uploaded Seagrass Data for {patch_id}")