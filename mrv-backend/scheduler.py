import os
import sys
import time
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
import logging

from main import run_monthly_pipeline
from sync.firestore_client import get_db

logger = logging.getLogger('Scheduler')

# --- Firestore State Management ---

PIPELINE_STATE_COLLECTION = 'MCIP_System_Config'
PIPELINE_STATE_DOC = 'pipeline_state'


def _get_state_ref():
    """Returns a reference to the pipeline_state Firestore document."""
    db = get_db()
    return db.collection(PIPELINE_STATE_COLLECTION).document(PIPELINE_STATE_DOC)


def read_pipeline_state() -> dict:
    """
    Reads the pipeline state from Firestore.
    Falls back to last_run.txt if the Firestore document doesn't exist yet,
    or if it's missing 'last_updated_month'.
    """
    state = {}
    try:
        ref = _get_state_ref()
        doc = ref.get()
        if doc.exists:
            state = doc.to_dict()
    except Exception as e:
        logger.warning(f"Could not read Firestore pipeline state: {e}")

    last_updated = state.get('last_updated_month')

    if not last_updated:
        # Fallback: bootstrap from last_run.txt
        state_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "last_run.txt")
        if os.path.exists(state_file):
            with open(state_file, "r") as f:
                last_updated = f.read().strip()

    if not last_updated:
        # As requested by the user, default to 2026-02 if nothing else is available
        last_updated = "2026-02"

    state['last_updated_month'] = last_updated
    
    if 'current_month' not in state:
        state['current_month'] = datetime.now(timezone.utc).strftime('%Y-%m')
    if 'pipeline_status' not in state:
        state['pipeline_status'] = 'idle'
    if 'last_run_timestamp' not in state:
        state['last_run_timestamp'] = None
    if 'last_error' not in state:
        state['last_error'] = None

    return state


def write_pipeline_state(updates: dict):
    """
    Merges updates into the Firestore pipeline_state document.
    Also keeps last_run.txt in sync as a local backup.
    """
    try:
        ref = _get_state_ref()
        ref.set(updates, merge=True)
        logger.info(f"Firestore pipeline state updated: {updates}")
    except Exception as e:
        logger.error(f"Failed to write Firestore pipeline state: {e}")

    # Local backup
    if 'last_updated_month' in updates:
        state_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "last_run.txt")
        try:
            with open(state_file, "w") as f:
                f.write(updates['last_updated_month'])
        except Exception as e:
            logger.warning(f"Could not update local last_run.txt: {e}")


def determine_next_month(month_str: str) -> str:
    """Calculates the subsequent month in YYYY-MM format."""
    year, month = map(int, month_str.split('-'))
    date_obj = datetime(year, month, 1) + relativedelta(months=1)
    return date_obj.strftime('%Y-%m')


def get_missing_months(last_updated: str, current: str) -> list:
    """
    Returns a list of all months between last_updated (exclusive) and current (inclusive).
    E.g. last_updated='2026-01', current='2026-04' -> ['2026-02', '2026-03', '2026-04']
    """
    months = []
    next_month = determine_next_month(last_updated)
    while next_month <= current:
        months.append(next_month)
        next_month = determine_next_month(next_month)
    return months


# --- Main Scheduler ---

def scheduler_entry(continuous: bool = False):
    """
    Entry point for the MRV Autonomous Scheduler.

    Reads `last_updated_month` and `current_month` from Firestore.
    When they don't match, the pipeline activates and processes all missing months
    sequentially to catch up.

    If continuous=True, it loops forever, sleeping between checks.
    """
    while True:
        # 1. Read state
        state = read_pipeline_state()
        last_updated_month = state.get('last_updated_month')
        current_month = datetime.now(timezone.utc).strftime('%Y-%m')

        # Always keep current_month fresh in Firestore
        write_pipeline_state({'current_month': current_month})

        logger.info(f"State check — last_updated: {last_updated_month}, current: {current_month}")

        # 2. Compare
        if last_updated_month >= current_month:
            logger.info(f"Pipeline is up to date (last: {last_updated_month}, now: {current_month}).")
            if not continuous:
                return
            logger.info("Sleeping 6 hours before next check...")
            time.sleep(6 * 3600)
            continue

        # 3. Months are different — activate pipeline
        missing = get_missing_months(last_updated_month, current_month)
        logger.info(f"Pipeline is behind! Missing months: {missing}")

        write_pipeline_state({
            'pipeline_status': 'running',
            'last_error': None
        })

        for month in missing:
            logger.info(f"Processing month: {month}")
            try:
                success = run_monthly_pipeline(month, dry_run=False)

                if success:
                    # Sync external context (weather, news) for the processed month
                    try:
                        from ingestion.external_context import sync_external_context
                        sync_external_context(month)
                        logger.info(f"External context synced for {month}.")
                    except Exception as ctx_err:
                        logger.warning(f"External context sync failed for {month}: {ctx_err}")

                    write_pipeline_state({
                        'last_updated_month': month,
                        'pipeline_status': 'idle',
                        'last_run_timestamp': datetime.now(timezone.utc).isoformat(),
                        'last_error': None
                    })
                    logger.info(f"Successfully processed {month}.")
                else:
                    error_msg = f"Pipeline returned False for {month}. Data may not be published yet."
                    logger.error(error_msg)
                    write_pipeline_state({
                        'pipeline_status': 'failed',
                        'last_error': error_msg
                    })
                    # Don't continue to next month if this one failed
                    break

            except Exception as e:
                error_msg = f"Pipeline exception for {month}: {str(e)}"
                logger.exception(error_msg)
                write_pipeline_state({
                    'pipeline_status': 'failed',
                    'last_error': error_msg
                })
                break

        # 4. After processing, decide whether to keep looping
        if not continuous:
            return

        # Re-read state to check if we caught up or hit a failure
        updated_state = read_pipeline_state()
        if updated_state.get('pipeline_status') == 'failed':
            logger.info("Pipeline failed. Retrying in 12 hours...")
            time.sleep(12 * 3600)
        else:
            logger.info("Caught up! Sleeping 6 hours before next check...")
            time.sleep(6 * 3600)


if __name__ == "__main__":
    is_continuous = "--continuous" in sys.argv
    scheduler_entry(is_continuous)
