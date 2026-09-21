import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

# 1. POINT DIRECTLY TO THE JSON FILE
# This avoids the "Unable to load PEM file" string error entirely.
json_path = r'C:\Users\naren\OneDrive\Desktop\unicorn\Blue Carbon & Mangrove AI (Sustainability Tech)\mangrove-backend\mangroove-startup-firebase-adminsdk-fbsvc-c06de3a40a.json'

cred = credentials.Certificate(json_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

def upload_csv_to_firestore(file_path):
    print(f"Reading data from: {file_path}")
    df = pd.read_csv(file_path)
    
    # Standardize column names to lowercase
    df.columns = df.columns.str.strip().str.lower()
    
    for index, row in df.iterrows():
        try:
            # Map ID from 'system:index'
            p_id = str(row['system:index'])
            
            # Parse coordinates from '.geo' column
            geo_data = json.loads(row['.geo'])
            lon, lat = geo_data['coordinates']
            
            # Calculate 2023 baseline height
            height_cols = [f'height_m{i}' for i in range(1, 13)]
            avg_height_2023 = row[height_cols].mean()
            
            # 2. TARGET THE DATABASE: 'mangroove-startup'
            doc_ref = db.collection('patches').document(p_id)
            doc_ref.set({
                'latitude': float(lat),
                'longitude': float(lon),
                'health_score': 0.5, 
                'last_updated': '2023-12-31'
            }, merge=True)
            
            # 3. ADD HISTORY: 2023 baseline
            doc_ref.collection('carbonTimeseries').document('2023-12-31').set({
                'carbon_absorption_tco2e': float(avg_height_2023 * 0.5),
                'avg_height_2023': float(avg_height_2023),
                'timestamp': firestore.SERVER_TIMESTAMP,
                'source': 'CSV Training Data'
            })
            
            if index % 50 == 0:
                print(f"Progress: Uploaded {index} patches...")
            
        except Exception as e:
            print(f"Error processing row {index}: {e}")

    print("--- SUCCESS: ALL DATA UPLOADED TO MANGROOVE-STARTUP ---")

# 4. RUN THE IMPORT
csv_filename = r'outputs_lstm_gnn mangrove_timeseries_2023.csv'
upload_csv_to_firestore(csv_filename)