"""
Forte.AI ML Service
FastAPI сервис для предсказаний мошенничества с интеграцией OpenAI
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import joblib
import numpy as np
import pandas as pd
import shap
from pathlib import Path
import json
from datetime import datetime
import os
from openai import OpenAI
from dotenv import load_dotenv
import hashlib

# MLflow для трекинга экспериментов
import mlflow
from mlflow.tracking import MlflowClient

# Prometheus метрики
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from prometheus_fastapi_instrumentator import Instrumentator
from starlette.responses import Response

# Загрузка переменных окружения из .env
load_dotenv()

app = FastAPI(
    title="Forte.AI ML Service",
    description="GREKdev API with AI Analysis",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== PROMETHEUS METRICS ====================

# Счётчики
PREDICTIONS_TOTAL = Counter(
    "forte_predictions_total",
    "Total number of predictions made",
    ["risk_level", "blocked"]
)

PREDICTIONS_ERRORS = Counter(
    "forte_predictions_errors_total",
    "Total number of prediction errors"
)

BATCH_PREDICTIONS_TOTAL = Counter(
    "forte_batch_predictions_total",
    "Total number of batch prediction requests"
)

# Гистограммы
PREDICTION_LATENCY = Histogram(
    "forte_prediction_latency_seconds",
    "Prediction latency in seconds",
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

FRAUD_SCORE_DISTRIBUTION = Histogram(
    "forte_fraud_score",
    "Distribution of fraud scores",
    buckets=[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
)

# Gauges
MODEL_VERSION_INFO = Gauge(
    "forte_model_version",
    "Current model version (as float, e.g., 1.02 for v1.0.2)"
)

CURRENT_THRESHOLD = Gauge(
    "forte_current_threshold",
    "Current fraud detection threshold"
)

DRIFT_SCORE = Gauge(
    "forte_drift_score",
    "Current data drift score"
)

# Инструментация FastAPI
instrumentator = Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    should_respect_env_var=True,
    should_instrument_requests_inprogress=True,
    excluded_handlers=["/metrics", "/health"],
    inprogress_name="forte_inprogress_requests",
    inprogress_labels=True,
)
instrumentator.instrument(app)

# Загрузка моделей
MODEL_DIR = Path("models")
lgb_model = None
xgb_model = None
scaler = None
label_encoders = None
metadata = None
explainer = None
openai_client = None


@app.on_event("startup")
async def load_models():
    """Загрузка моделей при старте"""
    global lgb_model, xgb_model, scaler, label_encoders, metadata, explainer, openai_client

    print("[STARTUP] Загрузка моделей...")

    try:
        lgb_model = joblib.load(MODEL_DIR / 'lgb_model.joblib')
        xgb_model = joblib.load(MODEL_DIR / 'xgb_model.joblib')
        scaler = joblib.load(MODEL_DIR / 'scaler.joblib')
        label_encoders = joblib.load(MODEL_DIR / 'label_encoders.joblib')

        with open(MODEL_DIR / 'metadata.json', 'r') as f:
            metadata = json.load(f)

        # Инициализация SHAP explainer
        print("[SHAP] Инициализация SHAP explainer...")
        # Используем TreeExplainer для LightGBM
        explainer = shap.TreeExplainer(lgb_model)

        # Инициализация OpenAI
        api_key = os.getenv('OPENAI_API_KEY')
        if api_key:
            openai_client = OpenAI(api_key=api_key)
            print("[AI] OpenAI клиент инициализирован")
        else:
            print("[WARNING] OPENAI_API_KEY не найден. AI анализ будет недоступен.")

        print("[OK] Модели загружены успешно!")
        print(f"Версия модели: {metadata['version']}")
        print(f"Оптимальный порог: {metadata['optimal_threshold']}")

        # Устанавливаем Prometheus gauge метрики
        try:
            version_parts = metadata['version'].split('.')
            version_float = float(f"{version_parts[0]}.{version_parts[1]}{version_parts[2]}")
            MODEL_VERSION_INFO.set(version_float)
        except:
            MODEL_VERSION_INFO.set(1.0)

        CURRENT_THRESHOLD.set(metadata['optimal_threshold'])

        # Экспозиция метрик
        instrumentator.expose(app)
        print("[PROMETHEUS] Метрики доступны на /metrics")

    except Exception as e:
        print(f"[ERROR] Ошибка загрузки моделей: {e}")
        raise


class TransactionFeatures(BaseModel):
    """Признаки транзакции для предсказания"""
    # Транзакционные данные
    amount: float = Field(..., description="Сумма транзакции")
    hour: int = Field(..., ge=0, le=23, description="Час транзакции")
    day_of_week: int = Field(..., ge=0, le=6, description="День недели")
    direction: str = Field(..., description="Направление перевода (хеш)")

    # Поведенческие паттерны
    monthly_os_changes: Optional[int] = None
    monthly_phone_model_changes: Optional[int] = None
    last_phone_model: Optional[str] = None
    last_os: Optional[str] = None
    logins_last_7_days: Optional[int] = None
    logins_last_30_days: Optional[int] = None
    login_frequency_7d: Optional[float] = None
    login_frequency_30d: Optional[float] = None
    freq_change_7d_vs_mean: Optional[float] = None
    logins_7d_over_30d_ratio: Optional[float] = None
    avg_login_interval_30d: Optional[float] = None
    std_login_interval_30d: Optional[float] = None
    var_login_interval_30d: Optional[float] = None
    ewm_login_interval_7d: Optional[float] = None
    burstiness_login_interval: Optional[float] = None
    fano_factor_login_interval: Optional[float] = None
    zscore_avg_login_interval_7d: Optional[float] = None


class PredictionResponse(BaseModel):
    """Ответ с предсказанием"""
    fraud_probability: float
    fraud_score: float
    risk_level: str
    should_block: bool
    model_version: str
    shap_values: Optional[Dict[str, float]] = None
    ai_analysis: Optional[str] = None
    aml_analysis: Optional[str] = None
    recommendation: Optional[str] = None
    analysis_fingerprint: Optional[str] = None
    top_risk_factors: List[Dict[str, Any]]


def prepare_features(transaction: TransactionFeatures) -> np.ndarray:
    """Подготовка признаков для предсказания"""
    # Создаем DataFrame
    data = transaction.model_dump()

    # Инжиниринг признаков
    data['amount_log'] = np.log1p(data['amount'])
    data['is_weekend'] = int(data['day_of_week'] in [5, 6])
    data['is_night'] = int(data['hour'] >= 22 or data['hour'] <= 6)
    data['is_business_hours'] = int(9 <= data['hour'] <= 18)

    # Кодирование категориальных
    if 'last_phone_model' in data and data['last_phone_model']:
        if 'last_phone_model_categorical' in label_encoders:
            le = label_encoders['last_phone_model_categorical']
            try:
                data['last_phone_model_categorical_encoded'] = le.transform([data['last_phone_model']])[0]
            except:
                data['last_phone_model_categorical_encoded'] = -1
        del data['last_phone_model']

    if 'last_os' in data and data['last_os']:
        if 'last_os_categorical' in label_encoders:
            le = label_encoders['last_os_categorical']
            try:
                data['last_os_categorical_encoded'] = le.transform([data['last_os']])[0]
            except:
                data['last_os_categorical_encoded'] = -1
        del data['last_os']

    if 'direction' in data and data['direction']:
        if 'direction' in label_encoders:
            le = label_encoders['direction']
            try:
                data['direction_encoded'] = le.transform([data['direction']])[0]
            except:
                data['direction_encoded'] = -1
        del data['direction']

    # Преобразуем в DataFrame
    df = pd.DataFrame([data])

    # Добавляем недостающие признаки
    for feat in metadata['feature_names']:
        if feat not in df.columns:
            df[feat] = -999

    # Сортируем столбцы в нужном порядке
    df = df[metadata['feature_names']]

    # Заполнение NaN
    df = df.fillna(-999)

    # Масштабирование
    X_scaled = scaler.transform(df)

    return X_scaled, df


def get_risk_level(probability: float, threshold: float) -> str:
    """Определение уровня риска"""
    if probability >= threshold + 0.2:
        return "CRITICAL"
    elif probability >= threshold + 0.1:
        return "HIGH"
    elif probability >= threshold:
        return "MEDIUM"
    else:
        return "LOW"


async def get_ai_analysis(
    transaction: TransactionFeatures,
    probability: float,
    risk_level: str,
    top_factors: List[Dict[str, Any]]
) -> tuple[str, str, str, str]:
    """Получение AI анализа от OpenAI с AML проверкой"""
    if not openai_client:
        return None, None, None, None

    try:
        # Формируем промпт для fraud анализа
        fraud_prompt = f"""Ты - эксперт по анализу мошеннических транзакций в банковской системе Forte.AI.

Проанализируй следующую транзакцию:

**Данные транзакции:**
- Сумма: {transaction.amount} тенге
- Время: {transaction.hour}:00, день недели: {transaction.day_of_week}
- Активность входов за 7 дней: {transaction.logins_last_7_days}
- Активность входов за 30 дней: {transaction.logins_last_30_days}
- Изменения устройств за месяц: {transaction.monthly_phone_model_changes}
- Изменения ОС за месяц: {transaction.monthly_os_changes}

**Результаты ML-модели:**
- Вероятность мошенничества: {probability:.1%}
- Уровень риска: {risk_level}

**Топ факторы риска:**
{chr(10).join([f"- {f['feature']}: {f['impact']:.3f}" for f in top_factors[:5]])}

Предоставь:
1. **Краткий анализ** (2-3 предложения): почему эта транзакция имеет такой уровень риска?
2. **Рекомендацию** (1-2 предложения): что должен сделать аналитик?

Будь конкретным и профессиональным. Отвечай на русском языке."""

        # AML анализ
        aml_prompt = f"""Ты - эксперт по AML (Anti-Money Laundering) в финансовой системе.

Проанализируй транзакцию на признаки отмывания денег:

**Данные транзакции:**
- Сумма: {transaction.amount} тенге
- Время: {transaction.hour}:00, день недели: {transaction.day_of_week}
- Направление: {transaction.direction}
- Частота входов (7 дней): {transaction.logins_last_7_days}
- Частота входов (30 дней): {transaction.logins_last_30_days}
- Изменения устройств: {transaction.monthly_phone_model_changes}
- Изменения ОС: {transaction.monthly_os_changes}

**ML Risk Level:** {risk_level}

Предоставь:
1. **AML Risk Score** (LOW/MEDIUM/HIGH/CRITICAL)
2. **Признаки подозрительности** (2-3 пункта)
3. **Действия** (что проверить дополнительно)

Формат:
AML_SCORE: [уровень]
ПРИЗНАКИ:
- [признак 1]
- [признак 2]
ДЕЙСТВИЯ:
- [действие 1]
- [действие 2]"""

        # Параллельные запросы к OpenAI
        fraud_response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Ты - эксперт по антифроду в мобильном банкинге. Анализируй транзакции кратко и точно."
                },
                {"role": "user", "content": fraud_prompt}
            ],
            max_tokens=500,
            temperature=0.3
        )

        aml_response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Ты - эксперт по AML (Anti-Money Laundering). Выявляй схемы отмывания денег."
                },
                {"role": "user", "content": aml_prompt}
            ],
            max_tokens=600,
            temperature=0.3
        )

        fraud_analysis = fraud_response.choices[0].message.content
        aml_analysis = aml_response.choices[0].message.content

        # Разделяем анализ и рекомендацию
        parts = fraud_analysis.split("**Рекомендация")
        ai_analysis = parts[0].replace("**Краткий анализ**", "").strip()

        recommendation = ""
        if len(parts) > 1:
            recommendation = parts[1].replace(":**", "").replace("**:", "").strip()

        # Генерируем fingerprint (hash от всех данных анализа)
        fingerprint_data = f"{transaction.amount}_{transaction.hour}_{probability}_{risk_level}_{ai_analysis}_{aml_analysis}"
        fingerprint = hashlib.sha256(fingerprint_data.encode()).hexdigest()[:16]

        return ai_analysis, aml_analysis, recommendation, fingerprint

    except Exception as e:
        print(f"[WARNING] Ошибка AI анализа: {e}")
        return None, None, None, None


@app.post("/predict", response_model=PredictionResponse)
async def predict_fraud(transaction: TransactionFeatures):
    """Предсказание мошенничества для транзакции"""
    import time
    start_time = time.time()

    try:
        # Подготовка признаков
        X_scaled, X_df = prepare_features(transaction)

        # Предсказания от обеих моделей
        lgb_proba = lgb_model.predict_proba(X_scaled)[0, 1]
        xgb_proba = xgb_model.predict_proba(X_scaled)[0, 1]

        # Ансамбль
        fraud_probability = float(0.6 * lgb_proba + 0.4 * xgb_proba)
        fraud_score = fraud_probability * 100

        # Уровень риска
        threshold = metadata['optimal_threshold']
        risk_level = get_risk_level(fraud_probability, threshold)
        should_block = fraud_probability >= threshold

        # SHAP значения для объяснимости
        shap_values = explainer.shap_values(X_scaled)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]  # Для класса fraud

        # Топ факторы риска
        shap_dict = dict(zip(metadata['feature_names'], shap_values[0]))
        sorted_shap = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)

        top_risk_factors = [
            {
                "feature": feat,
                "impact": float(val),
                "direction": "increases" if val > 0 else "decreases"
            }
            for feat, val in sorted_shap[:10]
        ]

        # AI анализ (fraud + AML)
        ai_analysis, aml_analysis, recommendation, fingerprint = await get_ai_analysis(
            transaction, fraud_probability, risk_level, top_risk_factors
        )

        # Prometheus метрики
        latency = time.time() - start_time
        PREDICTION_LATENCY.observe(latency)
        FRAUD_SCORE_DISTRIBUTION.observe(fraud_score)
        PREDICTIONS_TOTAL.labels(
            risk_level=risk_level,
            blocked=str(should_block).lower()
        ).inc()

        return PredictionResponse(
            fraud_probability=fraud_probability,
            fraud_score=fraud_score,
            risk_level=risk_level,
            should_block=should_block,
            model_version=metadata['version'],
            shap_values={k: float(v) for k, v in shap_dict.items()},
            ai_analysis=ai_analysis,
            aml_analysis=aml_analysis,
            recommendation=recommendation,
            analysis_fingerprint=fingerprint,
            top_risk_factors=top_risk_factors
        )

    except Exception as e:
        PREDICTIONS_ERRORS.inc()
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    return {
        "status": "healthy",
        "model_loaded": lgb_model is not None and xgb_model is not None,
        "model_version": metadata['version'] if metadata else None,
        "openai_available": openai_client is not None
    }


@app.get("/model-info")
async def model_info():
    """Расширенная информация о модели с метриками"""
    if not metadata:
        raise HTTPException(status_code=500, detail="Model not loaded")

    # Calculate feature importance from LightGBM
    feature_importance = {}
    if lgb_model is not None:
        importances = lgb_model.feature_importances_
        feature_names = metadata['feature_names']
        for name, imp in zip(feature_names, importances):
            feature_importance[name] = float(imp)
        # Normalize to percentages
        total = sum(feature_importance.values())
        if total > 0:
            feature_importance = {k: round(v/total*100, 2) for k, v in feature_importance.items()}

    # Load metrics if available
    metrics = None
    metrics_path = MODEL_DIR / 'metrics.json'
    if metrics_path.exists():
        with open(metrics_path, 'r') as f:
            metrics = json.load(f)

    return {
        "version": metadata['version'],
        "model_type": metadata['model_type'],
        "optimal_threshold": metadata['optimal_threshold'],
        "created_at": metadata['created_at'],
        "num_features": len(metadata['feature_names']),
        "feature_names": metadata['feature_names'],
        "feature_importance": feature_importance,
        "metrics": metrics
    }


# ==================== THRESHOLD MANAGEMENT ====================

@app.get("/threshold")
async def get_threshold():
    """Get current fraud detection threshold"""
    if not metadata:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return {
        "threshold": metadata['optimal_threshold'],
        "description": "Transactions with fraud_probability >= threshold will be blocked"
    }


class ThresholdUpdate(BaseModel):
    threshold: float = Field(..., ge=0.0, le=1.0)


@app.post("/threshold")
async def update_threshold(request: ThresholdUpdate):
    """Update fraud detection threshold dynamically"""
    global metadata

    if not metadata:
        raise HTTPException(status_code=503, detail="Model not loaded")

    old_threshold = metadata['optimal_threshold']
    new_threshold = request.threshold

    # Update in memory
    metadata['optimal_threshold'] = new_threshold

    # Persist to file
    metadata_path = MODEL_DIR / 'metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    return {
        "old_threshold": old_threshold,
        "new_threshold": new_threshold,
        "message": f"Threshold updated from {old_threshold:.4f} to {new_threshold:.4f}"
    }


# ==================== BATCH PREDICTION ====================

class BatchPredictionRequest(BaseModel):
    transactions: List[TransactionFeatures]
    skip_ai_analysis: bool = True


@app.post("/predict/batch")
async def predict_batch(request: BatchPredictionRequest):
    """Batch prediction for multiple transactions"""
    import time
    start_time = time.time()

    predictions = []
    total_fraud_prob = 0.0
    blocked_count = 0
    threshold = metadata['optimal_threshold']

    for idx, transaction in enumerate(request.transactions):
        try:
            X_scaled, _ = prepare_features(transaction)

            lgb_proba = lgb_model.predict_proba(X_scaled)[0, 1]
            xgb_proba = xgb_model.predict_proba(X_scaled)[0, 1]
            fraud_prob = float(0.6 * lgb_proba + 0.4 * xgb_proba)
            fraud_score = fraud_prob * 100

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

            # SHAP values
            shap_vals = explainer.shap_values(X_scaled)
            if isinstance(shap_vals, list):
                shap_vals = shap_vals[1]
            shap_dict = dict(zip(metadata['feature_names'], shap_vals[0]))
            sorted_shap = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)
            top_factors = [
                {"feature": feat, "impact": float(val), "direction": "increases" if val > 0 else "decreases"}
                for feat, val in sorted_shap[:5]
            ]

            predictions.append({
                "index": idx,
                "fraud_probability": fraud_prob,
                "fraud_score": fraud_score,
                "risk_level": risk_level,
                "should_block": should_block,
                "top_risk_factors": top_factors
            })

        except Exception as e:
            predictions.append({
                "index": idx,
                "fraud_probability": 1.0,
                "fraud_score": 100.0,
                "risk_level": "CRITICAL",
                "should_block": True,
                "top_risk_factors": [{"feature": "error", "impact": 1.0, "direction": "increases"}]
            })
            blocked_count += 1
            total_fraud_prob += 1.0

    processing_time = (time.time() - start_time) * 1000
    avg_prob = total_fraud_prob / len(predictions) if predictions else 0.0

    return {
        "total": len(request.transactions),
        "processed": len(predictions),
        "avg_fraud_probability": avg_prob,
        "blocked_count": blocked_count,
        "processing_time_ms": round(processing_time, 2),
        "predictions": predictions
    }


# ==================== DATA DRIFT MONITORING ====================

_baseline_stats: Dict[str, Dict[str, float]] = {}


@app.post("/drift/set-baseline")
async def set_drift_baseline(transactions: List[TransactionFeatures]):
    """Set baseline statistics for drift detection"""
    global _baseline_stats

    if len(transactions) < 10:
        raise HTTPException(status_code=400, detail="Need at least 10 transactions for baseline")

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
    baseline_path = MODEL_DIR / 'baseline_stats.json'
    with open(baseline_path, 'w') as f:
        json.dump(_baseline_stats, f, indent=2)

    return {
        "message": "Baseline set successfully",
        "features_tracked": list(_baseline_stats.keys()),
        "sample_size": len(transactions)
    }


@app.post("/drift/check")
async def check_drift(transactions: List[TransactionFeatures]):
    """Check for data drift compared to baseline"""
    global _baseline_stats

    # Load baseline if not in memory
    if not _baseline_stats:
        baseline_path = MODEL_DIR / 'baseline_stats.json'
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

        if baseline['std'] > 0:
            drift = abs(current_mean - baseline['mean']) / baseline['std']
        else:
            drift = abs(current_mean - baseline['mean']) / (baseline['mean'] + 1e-10)

        drift_score = min(drift, 5.0) / 5.0
        total_drift_score += drift_score

        if drift_score > 0.3:
            features_with_drift.append({
                "feature": feature,
                "drift_score": round(drift_score, 3),
                "baseline_mean": round(baseline['mean'], 2),
                "current_mean": round(current_mean, 2),
                "change_percent": round((current_mean - baseline['mean']) / (baseline['mean'] + 1e-10) * 100, 1)
            })

    avg_drift = total_drift_score / len(_baseline_stats) if _baseline_stats else 0
    drift_detected = avg_drift > 0.3 or len(features_with_drift) >= 2

    if drift_detected:
        if avg_drift > 0.6:
            recommendation = "CRITICAL: Significant data drift detected. Immediate model retraining recommended."
        else:
            recommendation = "WARNING: Moderate drift detected. Schedule model retraining within the week."
    else:
        recommendation = "OK: No significant drift detected. Model performance should be stable."

    return {
        "drift_detected": drift_detected,
        "drift_score": round(avg_drift, 3),
        "features_with_drift": features_with_drift,
        "recommendation": recommendation,
        "checked_at": datetime.now().isoformat()
    }


# ==================== MLFLOW TRACKING ====================

# Инициализация MLflow - используем удалённый сервер
MLFLOW_URI = os.getenv("MLFLOW_TRACKING_URI", "https://forte.grekdev.com:5000")
mlflow.set_tracking_uri(MLFLOW_URI)
print(f"[MLflow] Tracking URI: {MLFLOW_URI}")

_mlflow_client: Optional[MlflowClient] = None


def get_mlflow_client() -> MlflowClient:
    """Lazy initialization of MLflow client"""
    global _mlflow_client
    if _mlflow_client is None:
        _mlflow_client = MlflowClient()
    return _mlflow_client


@app.get("/mlflow/experiments")
async def get_experiments():
    """Get list of MLflow experiments"""
    try:
        client = get_mlflow_client()
        experiments = client.search_experiments()

        return {
            "experiments": [
                {
                    "experiment_id": exp.experiment_id,
                    "name": exp.name,
                    "artifact_location": exp.artifact_location,
                    "lifecycle_stage": exp.lifecycle_stage
                }
                for exp in experiments
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MLflow error: {str(e)}")


@app.get("/mlflow/runs")
async def get_runs(experiment_name: str = "forte-fraud-detection", limit: int = 10):
    """Get list of MLflow runs for an experiment"""
    try:
        client = get_mlflow_client()

        # Find experiment
        experiment = client.get_experiment_by_name(experiment_name)
        if not experiment:
            return {"runs": [], "message": f"Experiment '{experiment_name}' not found"}

        # Get runs
        runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            order_by=["start_time DESC"],
            max_results=limit
        )

        return {
            "experiment_name": experiment_name,
            "runs": [
                {
                    "run_id": run.info.run_id,
                    "run_name": run.info.run_name,
                    "status": run.info.status,
                    "start_time": datetime.fromtimestamp(run.info.start_time / 1000).isoformat() if run.info.start_time else None,
                    "end_time": datetime.fromtimestamp(run.info.end_time / 1000).isoformat() if run.info.end_time else None,
                    "metrics": {k: round(v, 4) for k, v in run.data.metrics.items()},
                    "params": run.data.params,
                    "tags": run.data.tags
                }
                for run in runs
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MLflow error: {str(e)}")


@app.get("/mlflow/run/{run_id}")
async def get_run_details(run_id: str):
    """Get detailed information about a specific run"""
    try:
        client = get_mlflow_client()
        run = client.get_run(run_id)

        return {
            "run_id": run.info.run_id,
            "run_name": run.info.run_name,
            "status": run.info.status,
            "start_time": datetime.fromtimestamp(run.info.start_time / 1000).isoformat() if run.info.start_time else None,
            "end_time": datetime.fromtimestamp(run.info.end_time / 1000).isoformat() if run.info.end_time else None,
            "duration_seconds": (run.info.end_time - run.info.start_time) / 1000 if run.info.end_time and run.info.start_time else None,
            "metrics": {k: round(v, 4) for k, v in run.data.metrics.items()},
            "params": run.data.params,
            "tags": run.data.tags,
            "artifact_uri": run.info.artifact_uri
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MLflow error: {str(e)}")


@app.get("/mlflow/models")
async def get_registered_models():
    """Get list of registered models in MLflow Model Registry"""
    try:
        client = get_mlflow_client()
        models = client.search_registered_models()

        return {
            "models": [
                {
                    "name": model.name,
                    "creation_timestamp": datetime.fromtimestamp(model.creation_timestamp / 1000).isoformat() if model.creation_timestamp else None,
                    "last_updated_timestamp": datetime.fromtimestamp(model.last_updated_timestamp / 1000).isoformat() if model.last_updated_timestamp else None,
                    "description": model.description,
                    "latest_versions": [
                        {
                            "version": v.version,
                            "stage": v.current_stage,
                            "run_id": v.run_id,
                            "status": v.status
                        }
                        for v in model.latest_versions
                    ] if model.latest_versions else []
                }
                for model in models
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MLflow error: {str(e)}")


@app.get("/mlflow/compare")
async def compare_runs(run_ids: str):
    """Compare multiple runs by their IDs (comma-separated)"""
    try:
        client = get_mlflow_client()
        ids = [r.strip() for r in run_ids.split(",")]

        comparisons = []
        for run_id in ids:
            try:
                run = client.get_run(run_id)
                comparisons.append({
                    "run_id": run_id,
                    "run_name": run.info.run_name,
                    "metrics": {k: round(v, 4) for k, v in run.data.metrics.items()},
                    "params": run.data.params
                })
            except:
                comparisons.append({"run_id": run_id, "error": "Run not found"})

        return {"comparisons": comparisons}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MLflow error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
