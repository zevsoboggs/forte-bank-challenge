import logging
import sys
from app.core.config import settings

def setup_logging():
    """Configure logging for the application"""
    logger = logging.getLogger()
    logger.setLevel(settings.LOG_LEVEL)

    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(settings.LOG_LEVEL)
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    
    # Remove existing handlers
    logger.handlers = []
    logger.addHandler(handler)
    
    # Set specific levels for libraries to reduce noise
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)

    return logger

logger = setup_logging()
