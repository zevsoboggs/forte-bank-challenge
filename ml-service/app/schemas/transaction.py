from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

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
