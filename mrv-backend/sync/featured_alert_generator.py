"""
Featured Alert Generator
Generates predictive early warnings by analyzing weather forecasts, regional news,
and recent patch health trends. Uses a rule-based threat scoring engine.

Writes alerts to Firestore collection: MCIP_Featured_Alerts
These are DISTINCT from System Alerts (MCIP_System_Alerts) which track actual
carbon deviations. Featured Alerts predict FUTURE threats to prevent damage.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

from .firestore_client import get_db

logger = logging.getLogger('FeaturedAlerts')

FEATURED_ALERTS_COLLECTION = 'MCIP_Featured_Alerts'
EXTERNAL_CONTEXT_COLLECTION = 'MCIP_External_Context'


def generate_featured_alerts(context_doc_id: str = None) -> List[Dict[str, Any]]:
    """
    Reads the latest external context from Firestore and generates
    predictive early-warning alerts for the mangrove patches.
    """
    db = get_db()

    if not context_doc_id:
        context_doc_id = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    # 1. Read external context
    logger.info(f"Reading external context from {EXTERNAL_CONTEXT_COLLECTION}/{context_doc_id}")
    doc = db.collection(EXTERNAL_CONTEXT_COLLECTION).document(context_doc_id).get()

    if not doc.exists:
        logger.warning(f"No external context found for {context_doc_id}. Cannot generate featured alerts.")
        return []

    context = doc.to_dict()
    climate = context.get('climate', {})
    news = context.get('news', {})

    # 2. Read recent patch health scores for cross-referencing
    patches_at_risk = _get_vulnerable_patches(db)

    # 3. Generate predictive alerts
    generated_alerts = []
    today_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    # --- Climate-based alerts (Must be future forecast dates) ---
    for weather_alert in climate.get('alerts', []):
        alert_date = weather_alert.get('date', '')
        # Only alert for future forecast dates (at least tomorrow onwards)
        if alert_date and alert_date > today_str:
            alert = _create_featured_alert(
                category='CLIMATE',
                threat_type=weather_alert.get('type', 'WEATHER_ANOMALY'),
                severity=weather_alert.get('severity', 'MEDIUM'),
                title=f"Forecast Threat: {weather_alert.get('type', 'Weather Event')}",
                description=weather_alert.get('details', 'A weather anomaly has been detected.'),
                predicted_date=alert_date,
                affected_patches=_match_patches_to_threat(weather_alert, patches_at_risk),
                source='OpenWeatherMap Forecast',
            )
            generated_alerts.append(alert)

    # --- News-based alerts ---
    for threat in news.get('threatSummary', []):
        # Clean title hash for deterministic ID
        headline = threat.get('headline', 'Regional Threat Detected')
        alert = _create_featured_alert(
            category='GEOPOLITICAL' if threat['type'] in ('GEOPOLITICAL_CONFLICT', 'SHIPPING_DISRUPTION') else 'ENVIRONMENTAL',
            threat_type=threat.get('type', 'NEWS_THREAT'),
            severity=threat.get('severity', 'MEDIUM'),
            title=f"Threat Intelligence: {headline}",
            description=f"Source intelligence indicates: {headline}. "
                        f"This may affect coastal mangrove ecosystems in the Abu Dhabi region.",
            predicted_date=threat.get('date', '')[:10],
            affected_patches=_match_patches_to_threat(threat, patches_at_risk),
            source=f"NewsAPI — {headline[:60]}",
        )
        generated_alerts.append(alert)

    # --- Compound risk alerts (climate + news converge) ---
    climate_severity = _count_severity(climate.get('alerts', []))
    news_severity = _count_severity(news.get('threatSummary', []))

    if climate_severity['HIGH'] > 0 and news_severity['MEDIUM'] > 0:
        alert = _create_featured_alert(
            category='COMPOUND',
            threat_type='MULTI_FACTOR_RISK',
            severity='CRITICAL',
            title='Compound Threat: Climate + Regional Instability',
            description=(
                f"Multiple threat vectors detected simultaneously: "
                f"{climate_severity['HIGH']} high-severity weather events combined with "
                f"{news_severity['MEDIUM']} regional news threats. "
                f"Recommend immediate coastal monitoring escalation."
            ),
            predicted_date=today_str,
            affected_patches=[p['patchId'] for p in patches_at_risk[:10]],
            source='MCIP Compound Risk Engine',
        )
        generated_alerts.append(alert)

    # 4. De-duplicate and write all alerts to Firestore
    # We use a deterministic ID format to avoid writing identical alerts multiple times.
    written_count = 0
    for alert in generated_alerts:
        try:
            # Deterministic document reference check
            doc_ref = db.collection(FEATURED_ALERTS_COLLECTION).document(alert['id'])
            if not doc_ref.get().exists:
                doc_ref.set(alert)
                written_count += 1
            else:
                logger.info(f"Skipping duplicate alert: {alert['id']}")
        except Exception as e:
            logger.error(f"Failed to write featured alert {alert['id']}: {e}")

    logger.info(f"Generated {len(generated_alerts)} featured alerts. Wrote {written_count} new alerts for {context_doc_id}.")
    return generated_alerts


def _create_featured_alert(
    category: str,
    threat_type: str,
    severity: str,
    title: str,
    description: str,
    predicted_date: str,
    affected_patches: List[str],
    source: str,
) -> Dict[str, Any]:
    """Creates a structured featured alert document with deterministic ID to prevent duplicates."""
    import hashlib
    now = datetime.now(timezone.utc)
    
    # Deterministic alert ID based on contents to prevent duplicate alerts
    unique_content = f"{category}_{threat_type}_{title}_{predicted_date}"
    content_hash = hashlib.md5(unique_content.encode('utf-8')).hexdigest()[:12]
    alert_id = f"FA_{threat_type}_{content_hash}"

    # Generate preventative actions based on threat type
    actions = _generate_preventative_actions(threat_type, severity, affected_patches)

    return {
        'id': alert_id,
        'category': category,  # CLIMATE, GEOPOLITICAL, ENVIRONMENTAL, COMPOUND
        'threatType': threat_type,
        'severity': severity,  # LOW, MEDIUM, HIGH, CRITICAL
        'title': title,
        'description': description,
        'predictedDate': predicted_date,
        'affectedPatches': affected_patches,
        'preventativeActions': actions,
        'source': source,
        'status': 'Active',  # Active, Acknowledged, Resolved, Expired
        'createdAt': now.isoformat(),
        'expiresAt': (now + timedelta(days=7)).isoformat(),
    }


def _generate_preventative_actions(threat_type: str, severity: str, patches: List[str]) -> List[Dict[str, str]]:
    """Generates specific preventative action plans based on threat type."""
    actions_map = {
        'EXTREME_HEAT': [
            {'action': 'Increase tidal flushing monitoring frequency', 'priority': 'HIGH',
             'details': 'Monitor water temperature in mangrove channels. Deploy shade nets on nursery patches.'},
            {'action': 'Activate aerial thermal imaging survey', 'priority': 'MEDIUM',
             'details': 'Schedule drone thermal survey to identify heat-stressed zones before canopy damage occurs.'},
        ],
        'HIGH_WIND': [
            {'action': 'Secure young saplings and restoration infrastructure', 'priority': 'HIGH',
             'details': 'Anchor newly planted seedlings. Remove loose equipment from coastal restoration sites.'},
            {'action': 'Pre-position coastal erosion barriers', 'priority': 'MEDIUM',
             'details': 'Deploy temporary sediment fencing along exposed patch boundaries.'},
        ],
        'STORM_WARNING': [
            {'action': 'Activate flood preparedness protocol', 'priority': 'HIGH',
             'details': 'Clear drainage channels in mangrove zones. Pre-stage recovery equipment.'},
            {'action': 'Suspend field operations for safety', 'priority': 'HIGH',
             'details': 'All coastal restoration and monitoring teams to stand down until storm passes.'},
        ],
        'OIL_SPILL': [
            {'action': 'Deploy containment booms around priority patches', 'priority': 'CRITICAL',
             'details': 'Immediate deployment of oil containment booms at tidal inlets serving critical patches.'},
            {'action': 'Activate spill response coordination with ADNOC', 'priority': 'CRITICAL',
             'details': 'Notify industrial partners and activate joint coastal protection protocol.'},
        ],
        'GEOPOLITICAL_CONFLICT': [
            {'action': 'Increase satellite monitoring frequency', 'priority': 'HIGH',
             'details': 'Switch to daily Sentinel-1 SAR monitoring to detect potential shipping debris or pollutants.'},
            {'action': 'Coordinate with coast guard for no-entry zones', 'priority': 'MEDIUM',
             'details': 'Establish buffer zones around critical mangrove patches near shipping lanes.'},
        ],
        'SHIPPING_DISRUPTION': [
            {'action': 'Monitor water quality at tidal inlets', 'priority': 'MEDIUM',
             'details': 'Increased shipping reroutes may introduce new pollutant pathways near mangrove zones.'},
        ],
        'INDUSTRIAL_DISCHARGE': [
            {'action': 'Deploy water quality sensors at affected outfalls', 'priority': 'HIGH',
             'details': 'Monitor salinity, temperature, and chemical markers near desalination plant discharge points.'},
            {'action': 'Request discharge volume data from facility operators', 'priority': 'MEDIUM',
             'details': 'Cross-reference brine discharge volumes with observed NDVI declines in adjacent patches.'},
        ],
        'COASTAL_DEVELOPMENT': [
            {'action': 'Document baseline conditions of nearby patches', 'priority': 'MEDIUM',
             'details': 'Capture high-res imagery and carbon stock measurements before construction impacts arrive.'},
        ],
        'FLOODING_RISK': [
            {'action': 'Check sediment traps and drainage infrastructure', 'priority': 'HIGH',
             'details': 'Ensure sediment traps are clear. Excessive sedimentation can suffocate pneumatophores.'},
        ],
        'MULTI_FACTOR_RISK': [
            {'action': 'Escalate to National Coastal Emergency Protocol', 'priority': 'CRITICAL',
             'details': 'Multiple simultaneous threats require coordinated multi-agency response.'},
            {'action': 'Deploy rapid assessment teams to all priority patches', 'priority': 'CRITICAL',
             'details': 'Field teams to conduct 48-hour rapid condition assessment on top 10 at-risk patches.'},
        ],
    }

    return actions_map.get(threat_type, [
        {'action': 'Increase monitoring vigilance', 'priority': 'MEDIUM',
         'details': f'A {threat_type} event has been flagged. Monitor affected patches closely.'},
    ])


def _get_vulnerable_patches(db) -> List[Dict[str, Any]]:
    """
    Reads recent health scores to identify patches that are already stressed
    and would be most vulnerable to additional external threats.
    """
    vulnerable = []
    try:
        patches_ref = db.collection('Patches').stream()
        for patch_doc in patches_ref:
            data = patch_doc.to_dict()
            health = data.get('healthScore', 100)
            if health < 70:  # Below 70 = already stressed
                vulnerable.append({
                    'patchId': patch_doc.id,
                    'healthScore': health,
                })
        vulnerable.sort(key=lambda x: x.get('healthScore', 100))
    except Exception as e:
        logger.warning(f"Could not read patch health scores: {e}")
    return vulnerable


def _match_patches_to_threat(threat: dict, vulnerable_patches: List[Dict]) -> List[str]:
    """
    Returns a list of patch IDs most likely to be affected by a given threat.
    For now, returns all vulnerable patches since we're monitoring a single
    coastal region. In the future, this could use spatial proximity analysis.
    """
    # All patches in the UAE mangrove zone are within the same ~50km coastal strip,
    # so weather and regional events affect them broadly.
    return [p['patchId'] for p in vulnerable_patches[:15]]


def _count_severity(alerts: list) -> dict:
    """Counts alerts by severity level."""
    counts = {'LOW': 0, 'MEDIUM': 0, 'HIGH': 0, 'CRITICAL': 0}
    for a in alerts:
        sev = a.get('severity', 'MEDIUM').upper()
        if sev in counts:
            counts[sev] += 1
    return counts
