"""Application configuration using Pydantic settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App settings
    app_name: str = "Vyaya"
    debug: bool = False
    
    # Database
    database_url: str = "sqlite:///app/data/vyaya.db"
    
    # Storage paths
    data_dir: Path = Path("/app/data")
    receipts_dir: Path = Path("/app/data/receipts")
    
    # OCR settings
    # OCR settings
    ocr_engine: str = "minicpm-v"  # minicpm-v, groq, ollama
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # File permissions
    puid: int = 1000
    pgid: int = 1000
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
