from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

class Settings(BaseSettings):
    PROJECT_NAME: str = "Forte.AI ML Service"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "GREKdev API with AI Analysis"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"
    
    # Model
    MODEL_DIR: Path = Path("models")
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL_FRAUD: str = "gpt-4o-mini"
    OPENAI_MODEL_AML: str = "gpt-4o-mini"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Игнорировать лишние переменные окружения

settings = Settings()
