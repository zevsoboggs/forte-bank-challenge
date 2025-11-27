# Forte.AI MLOps Architecture

## Текущая архитектура (Implemented)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FORTE.AI MLOps Stack                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   Next.js UI    │───▶│   FastAPI ML    │───▶│    MLflow       │         │
│  │  (localhost:3000)│    │ (localhost:8000)│    │ (localhost:5000)│         │
│  └─────────────────┘    └────────┬────────┘    └─────────────────┘         │
│                                  │                                          │
│                                  ▼                                          │
│                    ┌─────────────────────────┐                              │
│                    │   ML Models (Ensemble)  │                              │
│                    ├─────────────────────────┤                              │
│                    │  ┌──────────┐ ┌──────┐ │                              │
│                    │  │ LightGBM │ │XGBoost│ │                              │
│                    │  │  (60%)   │ │ (40%)│ │                              │
│                    │  └──────────┘ └──────┘ │                              │
│                    └─────────────────────────┘                              │
│                                  │                                          │
│                    ┌─────────────┴─────────────┐                            │
│                    │                           │                            │
│                    ▼                           ▼                            │
│          ┌─────────────────┐        ┌─────────────────┐                    │
│          │      SHAP       │        │    OpenAI       │                    │
│          │  TreeExplainer  │        │   GPT-4o-mini   │                    │
│          └─────────────────┘        └─────────────────┘                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## MLflow Integration (Implemented)

### Возможности

| Компонент | Статус | Описание |
|-----------|--------|----------|
| **Experiment Tracking** | ✅ | Трекинг всех экспериментов обучения |
| **Metrics Logging** | ✅ | Логирование ROC-AUC, F1, Precision, Recall |
| **Parameters Logging** | ✅ | Сохранение гиперпараметров моделей |
| **Model Registry** | ✅ | Версионирование моделей (Staging → Production) |
| **Artifacts** | ✅ | Сохранение scaler, feature names, metrics.json |
| **MLflow UI** | ✅ | Визуальный интерфейс на localhost:5000 |

### API Endpoints

```
GET  /mlflow/experiments     - Список экспериментов
GET  /mlflow/runs            - Список обучений
GET  /mlflow/run/{run_id}    - Детали конкретного run
GET  /mlflow/models          - Зарегистрированные модели
GET  /mlflow/compare         - Сравнение нескольких runs
```

---

## Production Architecture (Roadmap)

### Kafka + Airflow + MLflow

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FORTE.AI Production MLOps Architecture                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  DATA SOURCES                    STREAMING                    ML INFERENCE             │
│  ────────────                    ─────────                    ────────────             │
│                                                                                        │
│  ┌──────────────┐              ┌────────────┐               ┌────────────────┐        │
│  │ Mobile App   │─────────────▶│   Kafka    │──────────────▶│  ML Service    │        │
│  │ Transactions │              │  Cluster   │               │  (FastAPI)     │        │
│  └──────────────┘              │            │               └────────┬───────┘        │
│                                │ Topics:    │                        │                │
│  ┌──────────────┐              │ - txn_raw  │               ┌────────▼───────┐        │
│  │ Web Banking  │─────────────▶│ - txn_scored│──────────────▶│  Model Ensemble │       │
│  │              │              │ - alerts   │               │ LightGBM+XGBoost│       │
│  └──────────────┘              └────────────┘               └────────┬───────┘        │
│                                       │                              │                │
│                                       │                     ┌────────▼───────┐        │
│                                       │                     │ SHAP + GPT-4   │        │
│                                       │                     │ Explainability │        │
│                                       │                     └────────────────┘        │
│                                       │                                               │
│                                       ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐     │
│  │                              AIRFLOW DAGs                                     │     │
│  ├─────────────────────────────────────────────────────────────────────────────┤     │
│  │                                                                               │     │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │     │
│  │  │  Daily ETL  │───▶│  Feature    │───▶│   Model     │───▶│   Deploy    │   │     │
│  │  │   Pipeline  │    │ Engineering │    │  Training   │    │  Pipeline   │   │     │
│  │  └─────────────┘    └─────────────┘    └──────┬──────┘    └─────────────┘   │     │
│  │                                               │                             │     │
│  │  ┌─────────────┐    ┌─────────────┐          │                             │     │
│  │  │ Drift Check │    │  Alerting   │◀─────────┘                             │     │
│  │  │   Daily     │    │  Pipeline   │                                         │     │
│  │  └─────────────┘    └─────────────┘                                         │     │
│  │                                                                               │     │
│  └─────────────────────────────────────────────────────────────────────────────┘     │
│                                       │                                               │
│                                       ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐     │
│  │                              MLFLOW                                           │     │
│  ├─────────────────────────────────────────────────────────────────────────────┤     │
│  │                                                                               │     │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │     │
│  │  │   Experiment    │    │     Model       │    │    Artifact     │          │     │
│  │  │    Tracking     │    │    Registry     │    │     Store       │          │     │
│  │  │                 │    │                 │    │                 │          │     │
│  │  │ - Metrics       │    │ - Staging       │    │ - Models        │          │     │
│  │  │ - Parameters    │    │ - Production    │    │ - Scalers       │          │     │
│  │  │ - CV Scores     │    │ - Archived      │    │ - Configs       │          │     │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘          │     │
│  │                                                                               │     │
│  └─────────────────────────────────────────────────────────────────────────────┘     │
│                                                                                        │
│  MONITORING                          STORAGE                     VISUALIZATION         │
│  ──────────                          ───────                     ─────────────         │
│                                                                                        │
│  ┌──────────────┐              ┌────────────┐               ┌────────────────┐        │
│  │  Prometheus  │              │ PostgreSQL │               │    Grafana     │        │
│  │   Metrics    │              │   (Main)   │               │   Dashboards   │        │
│  └──────────────┘              └────────────┘               └────────────────┘        │
│                                                                                        │
│  ┌──────────────┐              ┌────────────┐               ┌────────────────┐        │
│  │   Alerting   │              │    S3      │               │   Next.js UI   │        │
│  │  (PagerDuty) │              │ (Artifacts)│               │  (Admin Panel) │        │
│  └──────────────┘              └────────────┘               └────────────────┘        │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Kafka Integration Details

### Topics Architecture

```yaml
kafka_topics:
  transactions_raw:
    description: "Raw transactions from mobile banking"
    partitions: 12
    replication: 3
    retention: 7d

  transactions_scored:
    description: "Transactions with fraud scores"
    partitions: 12
    replication: 3
    retention: 30d

  fraud_alerts:
    description: "High-risk transaction alerts"
    partitions: 6
    replication: 3
    retention: 90d

  model_predictions:
    description: "ML model outputs for monitoring"
    partitions: 6
    replication: 3
    retention: 30d
```

### Kafka Consumer (Python)

```python
from kafka import KafkaConsumer, KafkaProducer
import json

class FraudStreamProcessor:
    def __init__(self, ml_service_url: str):
        self.consumer = KafkaConsumer(
            'transactions_raw',
            bootstrap_servers=['kafka:9092'],
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        self.producer = KafkaProducer(
            bootstrap_servers=['kafka:9092'],
            value_serializer=lambda x: json.dumps(x).encode('utf-8')
        )
        self.ml_service_url = ml_service_url

    async def process_stream(self):
        for message in self.consumer:
            transaction = message.value

            # Score transaction
            score = await self.score_transaction(transaction)

            # Publish scored transaction
            self.producer.send('transactions_scored', {
                **transaction,
                'fraud_score': score['fraud_probability'],
                'risk_level': score['risk_level'],
                'should_block': score['should_block']
            })

            # Alert if high risk
            if score['risk_level'] in ['HIGH', 'CRITICAL']:
                self.producer.send('fraud_alerts', {
                    'transaction_id': transaction['id'],
                    'fraud_score': score['fraud_probability'],
                    'risk_level': score['risk_level'],
                    'top_factors': score['top_risk_factors'][:3]
                })
```

---

## Airflow DAGs

### 1. Daily Training Pipeline

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'mlops',
    'retries': 3,
    'retry_delay': timedelta(minutes=5)
}

with DAG(
    'forte_daily_training',
    default_args=default_args,
    schedule_interval='0 2 * * *',  # Every day at 2 AM
    start_date=datetime(2025, 1, 1),
    catchup=False
) as dag:

    extract_data = PythonOperator(
        task_id='extract_new_transactions',
        python_callable=extract_transactions_from_db
    )

    check_drift = PythonOperator(
        task_id='check_data_drift',
        python_callable=check_drift_scores
    )

    feature_engineering = PythonOperator(
        task_id='feature_engineering',
        python_callable=run_feature_engineering
    )

    train_model = PythonOperator(
        task_id='train_model',
        python_callable=train_with_mlflow
    )

    validate_model = PythonOperator(
        task_id='validate_model',
        python_callable=validate_model_performance
    )

    deploy_model = PythonOperator(
        task_id='deploy_to_production',
        python_callable=deploy_if_better,
        trigger_rule='all_success'
    )

    extract_data >> check_drift >> feature_engineering >> train_model >> validate_model >> deploy_model
```

### 2. Drift Monitoring DAG

```python
with DAG(
    'forte_drift_monitoring',
    schedule_interval='0 */6 * * *',  # Every 6 hours
    start_date=datetime(2025, 1, 1)
) as dag:

    collect_recent_data = PythonOperator(
        task_id='collect_recent_transactions',
        python_callable=get_last_6h_transactions
    )

    calculate_drift = PythonOperator(
        task_id='calculate_drift_scores',
        python_callable=calculate_drift_metrics
    )

    alert_if_drift = PythonOperator(
        task_id='alert_if_drift_detected',
        python_callable=send_drift_alerts
    )

    collect_recent_data >> calculate_drift >> alert_if_drift
```

---

## Docker Compose (Production)

```yaml
version: '3.8'

services:
  # Kafka
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092

  # Airflow
  airflow-webserver:
    image: apache/airflow:2.8.0
    ports:
      - "8080:8080"
    volumes:
      - ./dags:/opt/airflow/dags

  airflow-scheduler:
    image: apache/airflow:2.8.0
    depends_on:
      - airflow-webserver

  # MLflow
  mlflow:
    image: ghcr.io/mlflow/mlflow:v2.10.0
    ports:
      - "5000:5000"
    volumes:
      - ./mlruns:/mlflow/mlruns
    command: mlflow server --host 0.0.0.0 --port 5000

  # ML Service
  ml-service:
    build: ./ml-service
    ports:
      - "8000:8000"
    depends_on:
      - kafka
      - mlflow
    environment:
      - MLFLOW_TRACKING_URI=http://mlflow:5000
      - KAFKA_BOOTSTRAP_SERVERS=kafka:9092

  # PostgreSQL
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: forte_ai
      POSTGRES_USER: forte
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Monitoring
  prometheus:
    image: prom/prometheus:v2.48.0
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:10.2.0
    ports:
      - "3001:3000"
    depends_on:
      - prometheus

volumes:
  postgres_data:
  mlruns:
```

---

## Метрики для мониторинга

| Метрика | Описание | Alert Threshold |
|---------|----------|-----------------|
| `fraud_detection_latency_p99` | 99-й перцентиль латентности | > 500ms |
| `fraud_score_distribution` | Распределение fraud scores | Drift > 0.3 |
| `model_accuracy_daily` | Дневная точность модели | < 80% |
| `false_positive_rate` | Ложные срабатывания | > 5% |
| `kafka_consumer_lag` | Отставание consumer'а | > 1000 сообщений |
| `feature_drift_score` | Drift по признакам | > 0.3 |

---

## Roadmap

| Phase | Компонент | Статус | ETA |
|-------|-----------|--------|-----|
| 1 | MLflow Integration | ✅ Done | - |
| 2 | Enhanced Drift Monitoring | ✅ Done | - |
| 3 | Kafka Streaming | 📋 Planned | Q2 2025 |
| 4 | Airflow Pipelines | 📋 Planned | Q2 2025 |
| 5 | Prometheus/Grafana | 📋 Planned | Q3 2025 |
| 6 | Auto-retraining | 📋 Planned | Q3 2025 |

---

## Преимущества MLOps подхода

1. **Reproducibility** - Любой эксперимент можно воспроизвести
2. **Traceability** - Полная история всех обучений
3. **Scalability** - Kafka обеспечивает real-time processing
4. **Automation** - Airflow автоматизирует пайплайны
5. **Monitoring** - Prometheus/Grafana для мониторинга
6. **Governance** - Model Registry для управления версиями

---

**GREKdev Team** | Forte.AI MLOps Architecture
