from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.schemas.transaction import TransactionFeatures, PredictionResponse
from app.services.model_service import model_service
from app.services.ai_service import ai_service
from app.core.config import settings
import json
from pathlib import Path
import numpy as np
import asyncio
import time

# Import Prometheus metrics
from app.core.metrics import (
    PREDICTIONS_TOTAL, PREDICTION_LATENCY, FRAUD_SCORE,
    BLOCKED_TRANSACTIONS, PREDICTIONS_ERRORS, DRIFT_SCORE, CURRENT_THRESHOLD
)

router = APIRouter()


# ==================== NEW SCHEMAS ====================

class ThresholdUpdate(BaseModel):
    """Schema for threshold update"""
    threshold: float = Field(..., ge=0.0, le=1.0, description="New threshold value (0-1)")


class ThresholdResponse(BaseModel):
    """Response after threshold update"""
    old_threshold: float
    new_threshold: float
    message: str


class BatchPredictionRequest(BaseModel):
    """Request for batch predictions"""
    transactions: List[TransactionFeatures]
    skip_ai_analysis: bool = Field(default=True, description="Skip AI analysis for speed")


class BatchPredictionItem(BaseModel):
    """Single item in batch response"""
    index: int
    fraud_probability: float
    fraud_score: float
    risk_level: str
    should_block: bool
    top_risk_factors: List[Dict[str, Any]]


class BatchPredictionResponse(BaseModel):
    """Response for batch predictions"""
    total: int
    processed: int
    avg_fraud_probability: float
    blocked_count: int
    processing_time_ms: float
    predictions: List[BatchPredictionItem]


class ModelMetrics(BaseModel):
    """Extended model metrics"""
    version: str
    model_type: str
    optimal_threshold: float
    created_at: str
    num_features: int
    feature_names: List[str]
    feature_importance: Dict[str, float]
    metrics: Optional[Dict[str, Any]] = None  # Can contain nested dicts


class DriftReport(BaseModel):
    """Data drift monitoring report"""
    drift_detected: bool
    drift_score: float
    features_with_drift: List[Dict[str, Any]]
    recommendation: str
    checked_at: str

@router.post("/predict", response_model=PredictionResponse)
async def predict_fraud(transaction: TransactionFeatures):
    """
    Predict fraud probability for a transaction.
    """
    start_time = time.time()

    try:
        # 1. Get model prediction (CPU bound, runs in thread pool)
        prediction_result = await model_service.predict(transaction)

        fraud_probability = prediction_result["fraud_probability"]
        shap_values = prediction_result["shap_values"]

        # 2. Calculate derived metrics
        fraud_score = fraud_probability * 100
        threshold = model_service.metadata['optimal_threshold']

        # Determine risk level
        if fraud_probability >= threshold + 0.2:
            risk_level = "CRITICAL"
        elif fraud_probability >= threshold + 0.1:
            risk_level = "HIGH"
        elif fraud_probability >= threshold:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        should_block = fraud_probability >= threshold

        # 3. Record Prometheus metrics
        PREDICTIONS_TOTAL.labels(risk_level=risk_level).inc()
        FRAUD_SCORE.observe(fraud_score)
        if should_block:
            BLOCKED_TRANSACTIONS.inc()

        # 4. Get top risk factors from SHAP values
        sorted_shap = sorted(shap_values.items(), key=lambda x: abs(x[1]), reverse=True)
        top_risk_factors = [
            {
                "feature": feat,
                "impact": float(val),
                "direction": "increases" if val > 0 else "decreases"
            }
            for feat, val in sorted_shap[:10]
        ]

        # 5. Get AI Analysis (IO bound, async)
        ai_analysis, aml_analysis, recommendation, fingerprint = await ai_service.analyze_transaction(
            transaction, fraud_probability, risk_level, top_risk_factors
        )

        # Record latency
        PREDICTION_LATENCY.observe(time.time() - start_time)

        return PredictionResponse(
            fraud_probability=fraud_probability,
            fraud_score=fraud_score,
            risk_level=risk_level,
            should_block=should_block,
            model_version=model_service.metadata['version'],
            shap_values=shap_values,
            ai_analysis=ai_analysis,
            aml_analysis=aml_analysis,
            recommendation=recommendation,
            analysis_fingerprint=fingerprint,
            top_risk_factors=top_risk_factors
        )

    except Exception as e:
        # Record error latency and error count
        PREDICTION_LATENCY.observe(time.time() - start_time)
        PREDICTIONS_ERRORS.inc()
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@router.get("/health")
async def health_check():
    """
    Service health check
    """
    return {
        "status": "healthy",
        "model_loaded": model_service.lgb_model is not None,
        "model_version": model_service.metadata['version'] if model_service.metadata else None,
        "openai_available": ai_service.client is not None
    }

@router.get("/model-info", response_model=ModelMetrics)
async def model_info():
    """
    Get extended model metadata with metrics and feature importance
    """
    if not model_service.metadata:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Calculate feature importance from LightGBM
    feature_importance = {}
    if model_service.lgb_model is not None:
        importances = model_service.lgb_model.feature_importances_
        feature_names = model_service.metadata['feature_names']
        for name, imp in zip(feature_names, importances):
            feature_importance[name] = float(imp)
        # Normalize to percentages
        total = sum(feature_importance.values())
        if total > 0:
            feature_importance = {k: round(v/total*100, 2) for k, v in feature_importance.items()}

    # Load metrics if available
    metrics = None
    metrics_path = settings.MODEL_DIR / 'metrics.json'
    if metrics_path.exists():
        with open(metrics_path, 'r') as f:
            metrics = json.load(f)

    return ModelMetrics(
        version=model_service.metadata['version'],
        model_type=model_service.metadata['model_type'],
        optimal_threshold=model_service.metadata['optimal_threshold'],
        created_at=model_service.metadata['created_at'],
        num_features=len(model_service.metadata['feature_names']),
        feature_names=model_service.metadata['feature_names'],
        feature_importance=feature_importance,
        metrics=metrics
    )


# ==================== THRESHOLD MANAGEMENT ====================

@router.get("/threshold")
async def get_threshold():
    """Get current fraud detection threshold"""
    if not model_service.metadata:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return {
        "threshold": model_service.metadata['optimal_threshold'],
        "description": "Transactions with fraud_probability >= threshold will be blocked"
    }


@router.post("/threshold", response_model=ThresholdResponse)
async def update_threshold(request: ThresholdUpdate):
    """
    Update fraud detection threshold dynamically.
    Changes are persisted to metadata.json
    """
    if not model_service.metadata:
        raise HTTPException(status_code=503, detail="Model not loaded")

    old_threshold = model_service.metadata['optimal_threshold']
    new_threshold = request.threshold

    # Update in memory
    model_service.metadata['optimal_threshold'] = new_threshold

    # Update Prometheus metric
    CURRENT_THRESHOLD.set(new_threshold)

    # Persist to file
    metadata_path = settings.MODEL_DIR / 'metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(model_service.metadata, f, indent=2)

    return ThresholdResponse(
        old_threshold=old_threshold,
        new_threshold=new_threshold,
        message=f"Threshold updated from {old_threshold:.4f} to {new_threshold:.4f}"
    )


# ==================== BATCH PREDICTION ====================

@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(request: BatchPredictionRequest):
    """
    Batch prediction for multiple transactions.
    Optimized for speed - skips AI analysis by default.
    """
    import time
    start_time = time.time()

    if not model_service.lgb_model:
        raise HTTPException(status_code=503, detail="Model not loaded")

    predictions = []
    total_fraud_prob = 0.0
    blocked_count = 0
    threshold = model_service.metadata['optimal_threshold']

    # Process all transactions
    for idx, transaction in enumerate(request.transactions):
        try:
            # Get prediction (no AI analysis for speed)
            result = await model_service.predict(transaction)
            fraud_prob = result["fraud_probability"]
            shap_values = result["shap_values"]

            fraud_score = fraud_prob * 100

            # Determine risk level
            if fraud_prob >= threshold + 0.2:
                risk_level = "CRITICAL"
            elif fraud_prob >= threshold + 0.1:
                risk_level = "HIGH"
            elif fraud_prob >= threshold:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"

            should_block = fraud_prob >= threshold
            if should_block:
                blocked_count += 1

            total_fraud_prob += fraud_prob

            # Top risk factors
            sorted_shap = sorted(shap_values.items(), key=lambda x: abs(x[1]), reverse=True)
            top_factors = [
                {"feature": feat, "impact": float(val), "direction": "increases" if val > 0 else "decreases"}
                for feat, val in sorted_shap[:5]
            ]

            predictions.append(BatchPredictionItem(
                index=idx,
                fraud_probability=fraud_prob,
                fraud_score=fraud_score,
                risk_level=risk_level,
                should_block=should_block,
                top_risk_factors=top_factors
            ))

        except Exception as e:
            # Continue on error, mark as high risk
            predictions.append(BatchPredictionItem(
                index=idx,
                fraud_probability=1.0,
                fraud_score=100.0,
                risk_level="CRITICAL",
                should_block=True,
                top_risk_factors=[{"feature": "error", "impact": 1.0, "direction": "increases"}]
            ))
            blocked_count += 1
            total_fraud_prob += 1.0

    processing_time = (time.time() - start_time) * 1000
    avg_prob = total_fraud_prob / len(predictions) if predictions else 0.0

    return BatchPredictionResponse(
        total=len(request.transactions),
        processed=len(predictions),
        avg_fraud_probability=avg_prob,
        blocked_count=blocked_count,
        processing_time_ms=round(processing_time, 2),
        predictions=predictions
    )


# ==================== DATA DRIFT MONITORING ====================

# Store baseline statistics for drift detection
_baseline_stats: Dict[str, Dict[str, float]] = {}


@router.post("/drift/set-baseline")
async def set_drift_baseline(transactions: List[TransactionFeatures]):
    """
    Set baseline statistics for drift detection.
    Call this with representative training data.
    """
    global _baseline_stats

    if len(transactions) < 10:
        raise HTTPException(status_code=400, detail="Need at least 10 transactions for baseline")

    # Calculate statistics for numeric features
    numeric_features = ['amount', 'hour', 'day_of_week', 'logins_last_7_days',
                        'logins_last_30_days', 'monthly_os_changes', 'monthly_phone_model_changes']

    _baseline_stats = {}
    for feature in numeric_features:
        values = [getattr(t, feature, None) for t in transactions if getattr(t, feature, None) is not None]
        if values:
            _baseline_stats[feature] = {
                "mean": float(np.mean(values)),
                "std": float(np.std(values)),
                "min": float(np.min(values)),
                "max": float(np.max(values)),
                "count": len(values)
            }

    # Save baseline to file
    baseline_path = settings.MODEL_DIR / 'baseline_stats.json'
    with open(baseline_path, 'w') as f:
        json.dump(_baseline_stats, f, indent=2)

    return {
        "message": "Baseline set successfully",
        "features_tracked": list(_baseline_stats.keys()),
        "sample_size": len(transactions)
    }


class TrainingResponse(BaseModel):
    """Response after model training"""
    status: str
    message: str
    model_version: Optional[str] = None
    mlflow_run_id: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None


@router.post("/train", response_model=TrainingResponse)
async def train_model():
    """
    Trigger model training.
    Called by Airflow DAG or manually.
    Training runs in background - check /model-info for updated version.
    """
    import subprocess
    import sys
    import os
    from datetime import datetime

    try:
        # Set MLflow tracking URI
        mlflow_uri = os.getenv("MLFLOW_TRACKING_URI", "https://forte.grekdev.com:5000")

        # Run training script
        train_script = Path(__file__).parent.parent.parent / "train_model.py"

        if not train_script.exists():
            raise HTTPException(status_code=500, detail=f"Training script not found: {train_script}")

        # Run training in subprocess with MLflow URI
        env = os.environ.copy()
        env["MLFLOW_TRACKING_URI"] = mlflow_uri

        result = subprocess.run(
            [sys.executable, str(train_script)],
            capture_output=True,
            text=True,
            timeout=3600,  # 1 hour timeout
            env=env,
            cwd=str(train_script.parent)
        )

        if result.returncode != 0:
            return TrainingResponse(
                status="failed",
                message=f"Training failed: {result.stderr[-1000:] if result.stderr else 'Unknown error'}",
                metrics=None
            )

        # Reload the model after training
        model_service.load_models()

        # Get new model info
        metrics_path = settings.MODEL_DIR / 'metrics.json'
        metrics = None
        mlflow_run_id = None
        if metrics_path.exists():
            with open(metrics_path, 'r') as f:
                metrics = json.load(f)
                mlflow_run_id = metrics.get('mlflow', {}).get('run_id')

        return TrainingResponse(
            status="success",
            message="Model trained successfully",
            model_version=model_service.metadata.get('version') if model_service.metadata else None,
            mlflow_run_id=mlflow_run_id,
            metrics=metrics
        )

    except subprocess.TimeoutExpired:
        return TrainingResponse(
            status="timeout",
            message="Training exceeded 1 hour timeout"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")


@router.post("/reload-model")
async def reload_model():
    """
    Reload model from disk.
    Use after manual model update or training.
    """
    try:
        model_service.load_models()
        return {
            "status": "success",
            "message": "Model reloaded",
            "version": model_service.metadata.get('version') if model_service.metadata else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reload model: {str(e)}")


@router.post("/drift/check", response_model=DriftReport)
async def check_drift(transactions: List[TransactionFeatures]):
    """
    Check for data drift compared to baseline.
    Returns drift score and recommendations.
    """
    from datetime import datetime
    global _baseline_stats

    # Load baseline if not in memory
    if not _baseline_stats:
        baseline_path = settings.MODEL_DIR / 'baseline_stats.json'
        if baseline_path.exists():
            with open(baseline_path, 'r') as f:
                _baseline_stats = json.load(f)
        else:
            raise HTTPException(status_code=400, detail="No baseline set. Call /drift/set-baseline first")

    if len(transactions) < 5:
        raise HTTPException(status_code=400, detail="Need at least 5 transactions to check drift")

    features_with_drift = []
    total_drift_score = 0.0

    for feature, baseline in _baseline_stats.items():
        values = [getattr(t, feature, None) for t in transactions if getattr(t, feature, None) is not None]
        if not values:
            continue

        current_mean = float(np.mean(values))
        current_std = float(np.std(values))

        # Calculate drift using normalized difference
        if baseline['std'] > 0:
            drift = abs(current_mean - baseline['mean']) / baseline['std']
        else:
            drift = abs(current_mean - baseline['mean']) / (baseline['mean'] + 1e-10)

        drift_score = min(drift, 5.0) / 5.0  # Normalize to 0-1
        total_drift_score += drift_score

        if drift_score > 0.3:  # Threshold for significant drift
            features_with_drift.append({
                "feature": feature,
                "drift_score": round(drift_score, 3),
                "baseline_mean": round(baseline['mean'], 2),
                "current_mean": round(current_mean, 2),
                "change_percent": round((current_mean - baseline['mean']) / (baseline['mean'] + 1e-10) * 100, 1)
            })

    avg_drift = total_drift_score / len(_baseline_stats) if _baseline_stats else 0
    drift_detected = avg_drift > 0.3 or len(features_with_drift) >= 2

    # Update Prometheus metric
    DRIFT_SCORE.set(avg_drift)

    # Generate recommendation
    if drift_detected:
        if avg_drift > 0.6:
            recommendation = "CRITICAL: Significant data drift detected. Immediate model retraining recommended."
        else:
            recommendation = "WARNING: Moderate drift detected. Schedule model retraining within the week."
    else:
        recommendation = "OK: No significant drift detected. Model performance should be stable."

    return DriftReport(
        drift_detected=drift_detected,
        drift_score=round(avg_drift, 3),
        features_with_drift=features_with_drift,
        recommendation=recommendation,
        checked_at=datetime.now().isoformat()
    )
