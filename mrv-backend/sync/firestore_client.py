import firebase_admin
from firebase_admin import credentials, firestore
import os

from config import FIREBASE_SERVICE_ACCOUNT_PATH, GEE_PROJECT_ID

def get_db():
    """
    Initializes the Firebase Admin SDK if not already initialized
    and returns a Firestore client instance.
    """
    try:
        # Check if already initialized to avoid errors in long-running processes
        if not firebase_admin._apps:
            if os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY"):
                import json
                raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY").strip()
                cred_dict = json.loads(raw)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                print("Firebase Admin SDK initialized using FIREBASE_SERVICE_ACCOUNT_KEY")
            elif os.getenv("FIREBASE_ADMIN_PRIVATE_KEY") and os.getenv("FIREBASE_ADMIN_CLIENT_EMAIL"):
                private_key = os.getenv("FIREBASE_ADMIN_PRIVATE_KEY").replace("\\n", "\n")
                cred_dict = {
                    "type": "service_account",
                    "project_id": os.getenv("FIREBASE_ADMIN_PROJECT_ID", "mangroove-startup-96309"),
                    "client_email": os.getenv("FIREBASE_ADMIN_CLIENT_EMAIL"),
                    "private_key": private_key,
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                print("Firebase Admin SDK initialized using discrete FIREBASE_ADMIN_* env vars")
            else:
                path = FIREBASE_SERVICE_ACCOUNT_PATH
                if not path or not os.path.exists(path):
                    import glob
                    current_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    workspace_dir = os.path.dirname(current_backend_dir)
                    mrv_dir = os.path.join(workspace_dir, "mrv")
                    
                    json_files = (
                        glob.glob(os.path.join(current_backend_dir, "mangroove-startup*.json")) +
                        glob.glob(os.path.join(workspace_dir, "mangroove-startup*.json")) +
                        glob.glob(os.path.join(mrv_dir, "mangroove-startup*.json"))
                    )
                    if json_files:
                        path = json_files[0]
                        print(f"Auto-detected Firebase Service Account JSON at: {path}")
                    else:
                        raise ValueError(f"Firebase Service Account JSON not found at: {FIREBASE_SERVICE_ACCOUNT_PATH}")
                cred = credentials.Certificate(path)
                firebase_admin.initialize_app(cred)
                print(f"Firebase Admin SDK initialized using: {path}")
            
        return firestore.client()
        
    except Exception as e:
        print(f"Failed to initialize Firestore: {e}")
        raise
