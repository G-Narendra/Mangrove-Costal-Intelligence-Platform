import os
import sys
import logging
import threading
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("CoastalSentinelAPI")

app = FastAPI(
    title="Coastal Sentinel API",
    description="Autonomous MRV Pipeline and Model Serving Backend for the Mangrove Coastal Intelligence Platform (MCIP)",
    version="1.0.0"
)

# Enable CORS for Next.js frontend (Vercel) and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "service": "Coastal Sentinel API",
        "system": "Mangrove Coastal Intelligence Platform (MCIP)",
        "status": "online",
        "docs": "/docs",
        "endpoints": {
            "health": "/health",
            "status": "/api/status",
            "trigger_pipeline": "/api/pipeline/run"
        }
    }

@app.get("/health")
def health_check():
    has_firebase = bool(
        os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY") or
        (os.getenv("FIREBASE_ADMIN_PRIVATE_KEY") and os.getenv("FIREBASE_ADMIN_CLIENT_EMAIL")) or
        (os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH") and os.path.exists(os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")))
    )
    has_gee = bool(os.getenv("GEE_PROJECT_ID") or os.getenv("GEE_SERVICE_ACCOUNT"))

    return {
        "status": "healthy",
        "service": "coastal-sentinel-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "credentials": {
            "firebase_configured": has_firebase,
            "gee_configured": has_gee
        }
    }

@app.get("/api/status")
def get_status():
    try:
        from scheduler import read_pipeline_state
        state = read_pipeline_state()
        return {
            "status": "ok",
            "pipeline_state": state
        }
    except Exception as e:
        logger.warning(f"Could not read pipeline state: {e}")
        return {
            "status": "idle",
            "info": "Pipeline state not yet synced to Firestore or credentials pending.",
            "error": str(e)
        }

@app.post("/api/pipeline/run")
def trigger_pipeline(background_tasks: BackgroundTasks, month: Optional[str] = None):
    target_month = month or os.getenv("TARGET_START_MONTH", "2026-05")
    
    def run_worker(m: str):
        try:
            logger.info(f"Manual pipeline trigger for month: {m}")
            from main import run_monthly_pipeline
            run_monthly_pipeline(m, dry_run=False)
        except Exception as e:
            logger.exception(f"Pipeline execution failed for {m}: {e}")

    background_tasks.add_task(run_worker, target_month)
    return {
        "message": f"Pipeline execution queued for {target_month}",
        "status": "processing"
    }

@app.post("/api/alerts/trigger-daily")
def trigger_daily_alerts(background_tasks: BackgroundTasks):
    def alert_worker():
        try:
            logger.info("Executing daily featured alerts and weather/news threat analysis...")
            from daily_cron import run_daily_check
            run_daily_check()
        except Exception as e:
            logger.exception(f"Daily alert generation failed: {e}")

    background_tasks.add_task(alert_worker)
    return {
        "message": "Daily predictive threat analysis and featured alerts generation queued",
        "status": "processing"
    }

def _start_background_scheduler():
    enable_sched = os.getenv("ENABLE_BACKGROUND_SCHEDULER", "true").lower() in ("true", "1", "yes")
    if enable_sched:
        def worker():
            try:
                logger.info("Initializing autonomous MRV scheduler background thread...")
                from scheduler import scheduler_entry
                scheduler_entry(continuous=True)
            except Exception as err:
                logger.warning(f"Background scheduler encountered an issue: {err}")

        t = threading.Thread(target=worker, daemon=True)
        t.start()
        logger.info("Autonomous scheduler background thread started.")

@app.on_event("startup")
def on_startup():
    _start_background_scheduler()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("server:app", host="0.0.0.0", port=port)
