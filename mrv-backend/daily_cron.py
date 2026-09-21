#!/usr/bin/env python3
"""
Daily Cron Job for MCIP Featured Alerts
Fetches live weather forecasts and regional news, then generates
predictive early-warning alerts for the UAE mangrove patches.

Usage:
    python daily_cron.py              # Run once (one-shot)
    python daily_cron.py --continuous  # Loop every 24 hours

This is SEPARATE from the monthly scheduler.py which handles satellite
data ingestion and carbon MRV processing.
"""
import sys
import time
import logging
from datetime import datetime, timezone

from ingestion.external_context import sync_external_context
from sync.featured_alert_generator import generate_featured_alerts

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('daily_cron.log')
    ]
)
logger = logging.getLogger('DailyCron')


def run_daily_check():
    """
    Executes one cycle of the daily predictive alert pipeline:
    1. Fetch weather + news context from external APIs
    2. Write context to Firestore (MCIP_External_Context)
    3. Generate featured alerts based on the context (MCIP_Featured_Alerts)
    """
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    logger.info(f"=== Daily Cron: Starting predictive check for {today} ===")

    try:
        # Step 1: Fetch and sync external context
        logger.info("Step 1: Fetching external context (weather + news)...")
        context = sync_external_context(today)

        climate_alerts = len(context.get('climate', {}).get('alerts', []))
        news_threats = len(context.get('news', {}).get('threatSummary', []))
        logger.info(f"  -> Context synced: {climate_alerts} weather alerts, {news_threats} news threats")

        # Step 2: Generate featured alerts
        logger.info("Step 2: Generating predictive featured alerts...")
        alerts = generate_featured_alerts(today)
        logger.info(f"  -> Generated {len(alerts)} featured alerts")

        for alert in alerts:
            logger.info(f"    [{alert['severity']}] {alert['title']}")

        logger.info(f"=== Daily Cron: Complete for {today} ===")
        return True

    except Exception as e:
        logger.exception(f"Daily cron failed: {e}")
        return False


if __name__ == "__main__":
    is_continuous = "--continuous" in sys.argv

    if is_continuous:
        logger.info("Running in continuous mode. Will check every 24 hours.")
        while True:
            run_daily_check()
            logger.info("Sleeping 24 hours before next check...")
            time.sleep(24 * 3600)
    else:
        success = run_daily_check()
        sys.exit(0 if success else 1)
