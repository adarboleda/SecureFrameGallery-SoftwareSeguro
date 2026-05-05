import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    LSB_RATIO_MIN: float = float(os.getenv("LSB_RATIO_MIN", "0.499"))
    LSB_RATIO_MAX: float = float(os.getenv("LSB_RATIO_MAX", "0.501"))
    CHI_P_THRESHOLD: float = float(os.getenv("CHI_P_THRESHOLD", "0.99"))
    DCT_VARIANCE_THRESHOLD: float = float(os.getenv("DCT_VARIANCE_THRESHOLD", "10.0"))
    CORS_ALLOW_ORIGINS: str = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")

settings = Settings()
