import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

DATA_DIR = Path(os.getenv("DATA_DIR", BACKEND_DIR.parent / "data"))
# On Vercel only /tmp is writable (and not persistent): logs there are for debugging only.
DEFAULT_LOG_DIR = Path("/tmp/logs") if os.getenv("VERCEL") else BACKEND_DIR / "logs"
LOG_DIR = Path(os.getenv("LOG_DIR", DEFAULT_LOG_DIR))

EVALUATOR = os.getenv("EVALUATOR", "mock")

JEV_API_KEY = os.getenv("JEV_API_KEY", "")
JEV_API_URL = os.getenv("JEV_API_URL", "")
JEV_MODEL = os.getenv("JEV_MODEL", "jev-1.13.0")

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
