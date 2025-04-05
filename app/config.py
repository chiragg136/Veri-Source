import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# API Keys and environment variables
class Settings:
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./unisphere.db")
    # Fix DATABASE_URL for PostgreSQL if needed
    if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Security
    SECRET_KEY = os.getenv("SESSION_SECRET", "development_secret_key")
    
    # LLM Models
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")
    
    # Document Storage
    UPLOAD_FOLDER = str(BASE_DIR / "uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size
    ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt'}
    
    # LLM Configuration
    DEFAULT_MODEL = "llama-3.1-70b" if OPENAI_API_KEY == "" else "gpt-4"
    DOCUMENT_CHUNK_SIZE = 1000
    DOCUMENT_CHUNK_OVERLAP = 200

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
