import argparse
import sys
import logging
import os
import datetime
import pandas as pd

from config import TARGET_START_MONTH
from ingestion.coordinator import wait_for_data_synchronicity, ingest_all
from processing.pipeline import run_processing_pipeline
from sync.patch_sync import upload_patch_timeseries
from sync.registry_sync import upload_registry_records
from sync.health_score import calculate_and_upload_health_score
from sync.firestore_client import get_db

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('mrv_pipeline.log')
    ]
)
logger = logging.getLogger('MRV_Pipeline')

def run_monthly_pipeline(target_month: str, dry_run: bool = False):
    """
    Executes the full MRV pipeline for a given month.
    """
    logger.info(f"=== Starting MRV Pipeline for {target_month} ===")
    if dry_run:
        logger.info("DRY RUN MODE: No data will be written to Firestore.")

    try:
        # 1. Synchronicity Gate
        logger.info("Checking data synchronicity...")
        # Reduce retries if dry-run for faster testing
        retries = 2 if dry_run else 15
        is_ready = wait_for_data_synchronicity(target_month, max_retries=retries, retry_interval_hours=24)
        
        if not is_ready:
            logger.error("Data not fully available after polling. Exiting pipeline.")
            return False
            
        # 2. Ingestion
        logger.info("Starting Data Ingestion...")
        raw_df = ingest_all(target_month)
        if raw_df.empty:
            logger.error("Ingestion yielded no data.")
            return False
            
        # 3. Processing (Imputation + Carbon Metrics + STGNN)
        logger.info("Starting Neural Processing...")
        processed_df = run_processing_pipeline(raw_df, target_month)
        
        if dry_run:
            logger.info("Dry run complete. Sample data:")
            print(processed_df.head())
            return True
            
        # 4. Synchronization to Firestore
        logger.info("Starting Firestore Synchronization...")
        
        # 4a. Patch TimeSeries
        upload_patch_timeseries(processed_df, target_month)
        
        # 4b. Registry Records
        upload_registry_records(processed_df, target_month)
        
        # 4c. Health Scores
        calculate_and_upload_health_score(processed_df, target_month)
        
        # 5. Save locally to append to historical CSV (Optional, for next month's STGNN)
        from config import IMPUTED_CSV_PATH
        if os.path.exists(IMPUTED_CSV_PATH):
            try:
                # Append to existing
                historic_df = pd.read_csv(IMPUTED_CSV_PATH)
                updated_df = pd.concat([historic_df, processed_df], ignore_index=True)
                updated_df.to_csv(IMPUTED_CSV_PATH, index=False)
                logger.info("Local historical CSV updated.")
            except Exception as e:
                logger.warning(f"Failed to update historical CSV: {e}")
                
        # 6. Update pipeline state in Firestore
        try:
            db = get_db()
            state_ref = db.collection('MCIP_System_Config').document('pipeline_state')
            state_ref.set({
                'last_updated_month': target_month,
                'current_month': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m'),
                'pipeline_status': 'idle',
                'last_run_timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'last_error': None
            }, merge=True)
            logger.info("Pipeline state updated in Firestore.")
        except Exception as e:
            logger.warning(f"Could not update pipeline state in Firestore: {e}")

        logger.info(f"=== MRV Pipeline for {target_month} SUCCESS ===")
        return True
        
    except Exception as e:
        logger.exception(f"Pipeline failed with unhandled exception: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mangrove Carbon MRV Pipeline")
    parser.add_argument("--month", type=str, help="Target month in YYYY-MM format", default=None)
    parser.add_argument("--dry-run", action="store_true", help="Run without pushing to Firestore")
    
    args = parser.parse_args()
    
    month_to_run = args.month
    if not month_to_run:
        # Default to environment variable (TARGET_START_MONTH) or current month
        month_to_run = TARGET_START_MONTH if TARGET_START_MONTH else datetime.date.today().strftime('%Y-%m')
        
    success = run_monthly_pipeline(month_to_run, dry_run=args.dry_run)
    sys.exit(0 if success else 1)
