from datetime import datetime, timezone
from typing import Dict, Any, List
from .firestore_client import get_db

ALERTS_COLLECTION = 'MCIP_System_Alerts'

def process_deviations(patch_id: str, date_id: str, actual_carbon: float, actual_uncertainty: float):
    """
    Compares actual carbon absorption with the previous forecast for the same window.
    Triggers an alert if the deviation exceeds the uncertainty boundaries.
    """
    db = get_db()
    
    # 1. Fetch the previous forecast for this patch and month
    doc_ref = db.collection('MCIP_Carbon_Register').document(f"{patch_id}_{date_id}")
    try:
        doc = doc_ref.get()
    except Exception as e:
        if "429" in str(e) or "Quota exceeded" in str(e) or "ResourceExhausted" in str(e):
            print(f"Warning: Firestore Quota Exceeded on get(). Skipping deviation check for {patch_id}.")
            return
        raise e
        
    if not doc.exists:
        return # No previous forecast to compare against
        
    data = doc.to_dict()
    if not data.get('isForecast'):
        return # We already have actual data or it wasn't a forecast
        
    forecast_carbon = data.get('carbonAmount', 0.0)
    forecast_uncertainty = data.get('uncertainty', 0.1) # Default 10%
    
    # 2. Calculate Deviation
    if forecast_carbon == 0:
        return
        
    deviation = abs(actual_carbon - forecast_carbon) / forecast_carbon
    
    # Uncertainty boundary check
    # We trigger if the actual value is outside the forecasted confidence interval
    is_anomaly = abs(actual_carbon - forecast_carbon) > (forecast_carbon * forecast_uncertainty)
    
    if is_anomaly:
        severity = "LEVEL_1"
        if deviation > 0.30:
            severity = "LEVEL_3"
        elif deviation > 0.15:
            severity = "LEVEL_2"
            
        # 3. Create Alert Record
        alert_id = f"ALERT_{patch_id}_{date_id}_{datetime.now().strftime('%Y%m%d%H%M')}"
        alert_record = {
            'id': alert_id,
            'patchId': patch_id,
            'dateId': date_id,
            'type': 'CARBON_DEVIATION',
            'severity': severity,
            'forecastValue': forecast_carbon,
            'actualValue': actual_carbon,
            'deviationPercent': deviation * 100,
            'status': 'Pending', # Pending, Reviewed, Resolved
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'message': f"Significant carbon deviation detected in {patch_id} for {date_id}. Actual: {actual_carbon:.2f}, Forecast: {forecast_carbon:.2f} (+/-{forecast_uncertainty*100:.1f}%)",
            'xaiContext': {
                'source': 'STGNN_VS_REALTIME',
                'patchData': {
                    'patchId': patch_id,
                    'dateId': date_id,
                    'carbonDifference': actual_carbon - forecast_carbon
                }
            }
        }
        
        db.collection(ALERTS_COLLECTION).document(alert_id).set(alert_record)
        print(f"!!! ALERT TRIGGERED [{severity}]: {patch_id} at {date_id} !!!")
