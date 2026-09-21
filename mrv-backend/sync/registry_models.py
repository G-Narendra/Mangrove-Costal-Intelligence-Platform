import os
from datetime import datetime, timezone
from .firestore_client import get_db

# Centralized Collection Names
MCIP_CARBON_REGISTER = 'MCIP_Carbon_Register'
UAE_VERIFIED_REGISTER = 'UAE_Verified_Carbon_Register'
SYSTEM_ALERTS = 'MCIP_System_Alerts'
INTELLIGENCE_REPORTS = 'MCIP_Intelligence_Reports'
ALERT_ANALYSIS = 'MCIP_Alert_Analysis'

def create_intelligence_report(id_suffix: str, title: str, description: str, report_type: str = "MONTHLY_PIPELINE"):
    """
    Stubs a new intelligence report record in Firestore.
    The mcipIntelligenceId follows the format: UAE-MCIP-YYYY-NNNN
    """
    db = get_db()
    current_year = datetime.now().year
    
    # Generate a unique ID if not provided
    # In a real app, this might be an auto-increment or UUID
    report_id = f"UAE-MCIP-{current_year}-{id_suffix}"
    
    report_record = {
        'id': report_id,
        'title': title,
        'description': description,
        'type': report_type,
        'pdfUrl': None, # To be filled after PDF generation
        'viewUrl': None,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'mcipIntelligenceId': report_id
    }
    
    db.collection(INTELLIGENCE_REPORTS).document(report_id).set(report_record)
    print(f"Intelligence Report Created: {report_id}")
    return report_id

def log_alert_analysis(alert_id: str, transcript: list, guidance: str, suggestions: str, decision: str):
    """
    Stores a complete XAI analysis session for a specific alert.
    """
    db = get_db()
    analysis_id = f"ANALYSIS_{alert_id}"
    
    analysis_record = {
        'alertId': alert_id,
        'transcript': transcript,
        'guidance': guidance,
        'suggestions': suggestions,
        'decision': decision,
        'status': 'Reviewed',
        'reportPdfUrl': None,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    
    # Update the alert status as well
    db.collection(SYSTEM_ALERTS).document(alert_id).update({'status': 'Reviewed'})
    
    db.collection(ALERT_ANALYSIS).document(analysis_id).set(analysis_record)
    print(f"Alert Analysis Logged: {analysis_id}")
    return analysis_id
