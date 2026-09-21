"""
External Context Ingester
Fetches real-world environmental and geopolitical context for the UAE mangrove region.
This data enriches the XAI Specialist's answers and powers the Featured Alerts generator.

Data Sources:
  - OpenWeatherMap API: Temperature, humidity, wind, storm alerts, UV index
  - NewsAPI: Regional environmental/geopolitical news (oil spills, shipping, conflicts)
"""
import os
import json
import requests
import logging
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

from sync.firestore_client import get_db

load_dotenv()
logger = logging.getLogger('ExternalContext')

OPENWEATHERMAP_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

# Abu Dhabi Mangrove region coordinates
UAE_LAT = 24.45
UAE_LON = 54.65

EXTERNAL_CONTEXT_COLLECTION = 'MCIP_External_Context'


def fetch_climate_context() -> dict:
    """
    Fetches current weather + 5-day forecast for the UAE mangrove region
    from OpenWeatherMap. Returns a structured dict of climate conditions.
    """
    context = {
        'source': 'OpenWeatherMap',
        'fetchedAt': datetime.now(timezone.utc).isoformat(),
        'current': {},
        'forecast': [],
        'alerts': [],
    }

    if not OPENWEATHERMAP_API_KEY:
        logger.warning("OPENWEATHERMAP_API_KEY not set. Using mock climate data.")
        return _mock_climate_context()

    try:
        # Current weather
        current_url = (
            f"https://api.openweathermap.org/data/2.5/weather"
            f"?lat={UAE_LAT}&lon={UAE_LON}&appid={OPENWEATHERMAP_API_KEY}&units=metric"
        )
        resp = requests.get(current_url, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        context['current'] = {
            'temperature_C': data['main']['temp'],
            'feels_like_C': data['main']['feels_like'],
            'humidity_pct': data['main']['humidity'],
            'pressure_hPa': data['main']['pressure'],
            'wind_speed_mps': data['wind']['speed'],
            'wind_direction_deg': data['wind'].get('deg', 0),
            'wind_gust_mps': data['wind'].get('gust', 0),
            'weather_main': data['weather'][0]['main'],
            'weather_description': data['weather'][0]['description'],
            'visibility_m': data.get('visibility', 10000),
            'sea_level_hPa': data['main'].get('sea_level', data['main']['pressure']),
        }
        logger.info(f"Current weather: {context['current']['temperature_C']}°C, {context['current']['weather_description']}")

    except Exception as e:
        logger.error(f"Failed to fetch current weather: {e}")
        context['current'] = {'error': str(e)}

    try:
        # 5-day / 3-hour forecast
        forecast_url = (
            f"https://api.openweathermap.org/data/2.5/forecast"
            f"?lat={UAE_LAT}&lon={UAE_LON}&appid={OPENWEATHERMAP_API_KEY}&units=metric"
        )
        resp = requests.get(forecast_url, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        # Aggregate to daily summaries
        daily = {}
        for entry in data.get('list', []):
            dt = entry['dt_txt'][:10]  # YYYY-MM-DD
            if dt not in daily:
                daily[dt] = {
                    'date': dt,
                    'temps': [],
                    'humidity': [],
                    'wind_speeds': [],
                    'weather_types': [],
                }
            daily[dt]['temps'].append(entry['main']['temp'])
            daily[dt]['humidity'].append(entry['main']['humidity'])
            daily[dt]['wind_speeds'].append(entry['wind']['speed'])
            daily[dt]['weather_types'].append(entry['weather'][0]['main'])

        for dt, vals in daily.items():
            summary = {
                'date': dt,
                'temp_max_C': max(vals['temps']),
                'temp_min_C': min(vals['temps']),
                'temp_avg_C': round(sum(vals['temps']) / len(vals['temps']), 1),
                'humidity_avg_pct': round(sum(vals['humidity']) / len(vals['humidity']), 1),
                'wind_max_mps': max(vals['wind_speeds']),
                'dominant_weather': max(set(vals['weather_types']), key=vals['weather_types'].count),
            }

            # Flag extreme conditions
            if summary['temp_max_C'] > 45:
                context['alerts'].append({
                    'type': 'EXTREME_HEAT',
                    'date': dt,
                    'details': f"Predicted temperature {summary['temp_max_C']}°C exceeds 45°C threshold. Risk of thermal stress on mangroves.",
                    'severity': 'HIGH',
                })
            if summary['wind_max_mps'] > 15:
                context['alerts'].append({
                    'type': 'HIGH_WIND',
                    'date': dt,
                    'details': f"Wind gusts up to {summary['wind_max_mps']} m/s. Risk of canopy damage and coastal erosion.",
                    'severity': 'MEDIUM',
                })
            if summary['dominant_weather'] in ('Thunderstorm', 'Rain'):
                context['alerts'].append({
                    'type': 'STORM_WARNING',
                    'date': dt,
                    'details': f"Storms predicted. Potential for flash flooding and sediment disturbance in mangrove channels.",
                    'severity': 'MEDIUM',
                })

            context['forecast'].append(summary)

        logger.info(f"Fetched {len(context['forecast'])} days of forecast data with {len(context['alerts'])} weather alerts.")

    except Exception as e:
        logger.error(f"Failed to fetch forecast: {e}")

    return context


def fetch_news_context() -> dict:
    """
    Fetches recent UAE/Gulf environmental and geopolitical news from NewsAPI.
    Filters for mangrove-relevant topics: oil spills, shipping, coastal development,
    Middle East conflicts, desalination, etc.
    """
    context = {
        'source': 'NewsAPI',
        'fetchedAt': datetime.now(timezone.utc).isoformat(),
        'articles': [],
        'threatSummary': [],
    }

    if not NEWS_API_KEY:
        logger.warning("NEWS_API_KEY not set. Using mock news data.")
        return _mock_news_context()

    search_queries = [
        'UAE mangrove OR Abu Dhabi coast',
        'Persian Gulf oil spill OR shipping OR tanker',
        'Middle East conflict coast OR Red Sea shipping',
        'UAE desalination plant OR coastal development',
        'Arabian Gulf storm OR cyclone OR flooding',
    ]

    for q in search_queries:
        try:
            url = (
                f"https://newsapi.org/v2/everything"
                f"?q={q}&language=en&sortBy=publishedAt&pageSize=5"
                f"&from={(datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')}"
                f"&apiKey={NEWS_API_KEY}"
            )
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            data = resp.json()

            for article in data.get('articles', []):
                entry = {
                    'title': article.get('title', ''),
                    'description': article.get('description', ''),
                    'source': article.get('source', {}).get('name', 'Unknown'),
                    'publishedAt': article.get('publishedAt', ''),
                    'url': article.get('url', ''),
                    'searchQuery': q,
                }

                # Classify threat relevance
                title_lower = (entry['title'] + ' ' + (entry['description'] or '')).lower()
                threat = _classify_threat(title_lower)
                if threat:
                    entry['threatType'] = threat['type']
                    entry['threatSeverity'] = threat['severity']
                    context['threatSummary'].append({
                        'type': threat['type'],
                        'severity': threat['severity'],
                        'headline': entry['title'],
                        'date': entry['publishedAt'],
                    })

                context['articles'].append(entry)

        except Exception as e:
            logger.error(f"NewsAPI query failed for '{q}': {e}")

    logger.info(f"Fetched {len(context['articles'])} news articles with {len(context['threatSummary'])} identified threats.")
    
    # Fallback to mock data if all API calls failed (e.g., 401 unauthorized)
    if len(context['articles']) == 0:
        logger.warning("No news articles fetched from API. Falling back to mock news data for baseline threat intelligence.")
        return _mock_news_context()
    
    return context


def _classify_threat(text: str) -> dict | None:
    """Simple keyword-based threat classifier for news headlines."""
    if any(kw in text for kw in ['oil spill', 'oil leak', 'tanker accident', 'crude oil']):
        return {'type': 'OIL_SPILL', 'severity': 'CRITICAL'}
    if any(kw in text for kw in ['conflict', 'war', 'military', 'attack', 'missile', 'bombing']):
        return {'type': 'GEOPOLITICAL_CONFLICT', 'severity': 'HIGH'}
    if any(kw in text for kw in ['cyclone', 'hurricane', 'tropical storm', 'severe storm']):
        return {'type': 'SEVERE_WEATHER', 'severity': 'HIGH'}
    if any(kw in text for kw in ['shipping disruption', 'shipping lane', 'red sea', 'strait of hormuz']):
        return {'type': 'SHIPPING_DISRUPTION', 'severity': 'MEDIUM'}
    if any(kw in text for kw in ['desalination', 'brine discharge', 'industrial discharge']):
        return {'type': 'INDUSTRIAL_DISCHARGE', 'severity': 'MEDIUM'}
    if any(kw in text for kw in ['coastal development', 'reclamation', 'dredging', 'construction']):
        return {'type': 'COASTAL_DEVELOPMENT', 'severity': 'MEDIUM'}
    if any(kw in text for kw in ['flood', 'sea level', 'storm surge', 'tidal']):
        return {'type': 'FLOODING_RISK', 'severity': 'MEDIUM'}
    return None


def sync_external_context(target_date: str = None):
    """
    Master function: fetches climate + news context and writes to Firestore.
    target_date: either YYYY-MM or YYYY-MM-DD. Defaults to today.
    """
    if not target_date:
        target_date = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    doc_id = target_date  # e.g. '2026-05-25' for daily or '2026-05' for monthly

    logger.info(f"Syncing external context for {doc_id}...")

    climate = fetch_climate_context()
    news = fetch_news_context()

    record = {
        'dateId': doc_id,
        'updatedAt': datetime.now(timezone.utc).isoformat(),
        'climate': climate,
        'news': news,
        'combinedAlerts': climate.get('alerts', []) + news.get('threatSummary', []),
    }

    try:
        db = get_db()
        db.collection(EXTERNAL_CONTEXT_COLLECTION).document(doc_id).set(record, merge=True)
        logger.info(f"External context written to Firestore: {EXTERNAL_CONTEXT_COLLECTION}/{doc_id}")
    except Exception as e:
        logger.error(f"Failed to write external context to Firestore: {e}")

    return record


# --- Mock data fallbacks (for offline testing) ---

def _mock_climate_context() -> dict:
    return {
        'source': 'Mock',
        'fetchedAt': datetime.now(timezone.utc).isoformat(),
        'current': {
            'temperature_C': 42.3,
            'feels_like_C': 47.1,
            'humidity_pct': 55,
            'wind_speed_mps': 6.2,
            'weather_main': 'Haze',
            'weather_description': 'haze with high humidity',
        },
        'forecast': [
            {'date': (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d'),
             'temp_max_C': 43 + i, 'temp_min_C': 30 + i, 'temp_avg_C': 36 + i,
             'humidity_avg_pct': 60 - i * 2, 'wind_max_mps': 5 + i,
             'dominant_weather': 'Clear' if i < 3 else 'Thunderstorm'}
            for i in range(5)
        ],
        'alerts': [
            {'type': 'EXTREME_HEAT', 'date': (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d'),
             'details': 'Predicted temperature 46°C exceeds 45°C threshold. Risk of thermal stress on mangroves.',
             'severity': 'HIGH'},
        ],
    }


def _mock_news_context() -> dict:
    return {
        'source': 'Mock',
        'fetchedAt': datetime.now(timezone.utc).isoformat(),
        'articles': [
            {'title': 'Red Sea Shipping Disruptions Continue Amid Regional Tensions',
             'description': 'Commercial shipping through the Strait of Hormuz faces delays.',
             'source': 'Gulf News', 'publishedAt': datetime.now(timezone.utc).isoformat(),
             'threatType': 'SHIPPING_DISRUPTION', 'threatSeverity': 'MEDIUM'},
            {'title': 'UAE Expands Coastal Mangrove Restoration Along Abu Dhabi Coastline',
             'description': 'New planting initiative covers 500 hectares of degraded coastal zones.',
             'source': 'The National', 'publishedAt': datetime.now(timezone.utc).isoformat()},
            {'title': 'Desalination Brine Discharge Study Warns of Marine Ecosystem Impact',
             'description': 'Research shows concentrated brine from desalination may affect near-shore habitats.',
             'source': 'Nature ME', 'publishedAt': datetime.now(timezone.utc).isoformat(),
             'threatType': 'INDUSTRIAL_DISCHARGE', 'threatSeverity': 'MEDIUM'},
        ],
        'threatSummary': [
            {'type': 'SHIPPING_DISRUPTION', 'severity': 'MEDIUM',
             'headline': 'Red Sea Shipping Disruptions Continue Amid Regional Tensions',
             'date': datetime.now(timezone.utc).isoformat()},
            {'type': 'INDUSTRIAL_DISCHARGE', 'severity': 'MEDIUM',
             'headline': 'Desalination Brine Discharge Study Warns of Marine Ecosystem Impact',
             'date': datetime.now(timezone.utc).isoformat()},
        ],
    }
