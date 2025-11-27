# Prometheus metrics for ML Service
from prometheus_client import Counter, Histogram, Gauge

# Predictions counter by risk level
PREDICTIONS_TOTAL = Counter(
    'forte_predictions_total',
    'Total number of predictions made',
    ['risk_level']
)

# Prediction latency histogram
PREDICTION_LATENCY = Histogram(
    'forte_prediction_latency_seconds',
    'Prediction latency in seconds',
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

# Fraud score distribution
FRAUD_SCORE = Histogram(
    'forte_fraud_score',
    'Distribution of fraud scores',
    buckets=[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
)

# Model loaded status
MODEL_LOADED = Gauge(
    'forte_model_loaded',
    'Whether the ML model is loaded (1) or not (0)'
)

# Blocked transactions counter
BLOCKED_TRANSACTIONS = Counter(
    'forte_blocked_transactions_total',
    'Total number of blocked transactions'
)

# Prediction errors counter
PREDICTIONS_ERRORS = Counter(
    'forte_predictions_errors_total',
    'Total number of prediction errors'
)

# Data drift score
DRIFT_SCORE = Gauge(
    'forte_drift_score',
    'Current data drift score (0-1)'
)

# Current threshold
CURRENT_THRESHOLD = Gauge(
    'forte_current_threshold',
    'Current fraud detection threshold'
)
