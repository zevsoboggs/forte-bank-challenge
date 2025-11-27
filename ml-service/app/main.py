from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
from app.core.config import settings
from app.core.logging import logger
from app.core.metrics import MODEL_LOADED, CURRENT_THRESHOLD
from app.services.model_service import model_service

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description=settings.DESCRIPTION,
        version=settings.VERSION
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Prometheus metrics endpoint
    @app.get("/metrics")
    async def metrics():
        return Response(
            content=generate_latest(),
            media_type=CONTENT_TYPE_LATEST
        )

    # Include router (late import to avoid circular dependency)
    from app.api.routes import router
    app.include_router(router)

    @app.on_event("startup")
    async def startup_event():
        logger.info("Starting up application...")
        try:
            model_service.load_models()
            MODEL_LOADED.set(1)
            # Set initial threshold metric
            if model_service.metadata:
                CURRENT_THRESHOLD.set(model_service.metadata.get('optimal_threshold', 0.5))
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            MODEL_LOADED.set(0)
            pass

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
