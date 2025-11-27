"""
Forte.AI - Drift Monitoring DAG
Мониторинг data drift каждые 6 часов
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.operators.empty import EmptyOperator
from airflow.operators.trigger_dagrun import TriggerDagRunOperator
import requests
import json
import os

# Конфигурация
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://ml-service:8000")
CRITICAL_DRIFT_THRESHOLD = 0.6
WARNING_DRIFT_THRESHOLD = 0.3

default_args = {
    "owner": "forte-mlops",
    "depends_on_past": False,
    "email": ["mlops@forte.kz"],
    "email_on_failure": True,
    "retries": 2,
    "retry_delay": timedelta(minutes=2),
}


def collect_recent_transactions(**context):
    """
    Сбор транзакций за последние 6 часов
    """
    print("Collecting recent transactions for drift analysis...")

    # В реальном сценарии - запрос к БД за последние 6 часов
    # Здесь симулируем получение данных

    collection_result = {
        "period": "last_6_hours",
        "collected_at": datetime.now().isoformat(),
        "transaction_count": 1000,  # Симуляция
        "status": "collected"
    }

    context["ti"].xcom_push(key="collection_result", value=collection_result)

    print(f"Collection result: {json.dumps(collection_result, indent=2)}")

    return collection_result


def calculate_drift_metrics(**context):
    """
    Расчёт метрик drift
    """
    print("Calculating drift metrics...")

    try:
        # Запрос к ML сервису для проверки drift
        # В реальном сценарии передавали бы собранные транзакции
        response = requests.get(
            f"{ML_SERVICE_URL}/model-info",
            timeout=30
        )
        response.raise_for_status()

        model_info = response.json()

        # Симулируем drift метрики (в реальности - из /drift/check)
        drift_metrics = {
            "overall_drift_score": 0.15,  # Симуляция
            "feature_drifts": {
                "amount": {"drift": 0.12, "baseline_mean": 50000, "current_mean": 52000},
                "hour": {"drift": 0.08, "baseline_mean": 12, "current_mean": 13},
                "logins_7d": {"drift": 0.05, "baseline_mean": 10, "current_mean": 11}
            },
            "model_version": model_info.get("version", "unknown"),
            "calculated_at": datetime.now().isoformat()
        }

        context["ti"].xcom_push(key="drift_metrics", value=drift_metrics)

        print(f"Drift metrics: {json.dumps(drift_metrics, indent=2)}")

        return drift_metrics

    except Exception as e:
        print(f"Error calculating drift: {e}")
        # При ошибке возвращаем высокий drift для триггера алерта
        return {
            "overall_drift_score": 1.0,
            "error": str(e),
            "calculated_at": datetime.now().isoformat()
        }


def evaluate_drift_severity(**context):
    """
    Оценка серьёзности drift и решение о действиях
    """
    drift_metrics = context["ti"].xcom_pull(
        task_ids="calculate_drift_metrics",
        key="return_value"
    )

    if not drift_metrics:
        return "send_critical_alert"

    drift_score = drift_metrics.get("overall_drift_score", 1.0)

    print(f"Evaluating drift severity: score = {drift_score}")

    if drift_score >= CRITICAL_DRIFT_THRESHOLD:
        return "send_critical_alert"
    elif drift_score >= WARNING_DRIFT_THRESHOLD:
        return "send_warning_alert"
    else:
        return "log_healthy_status"


def send_critical_alert(**context):
    """
    Отправка критического алерта
    """
    drift_metrics = context["ti"].xcom_pull(
        task_ids="calculate_drift_metrics",
        key="return_value"
    )

    alert = {
        "severity": "CRITICAL",
        "type": "data_drift",
        "drift_score": drift_metrics.get("overall_drift_score", 1.0),
        "message": "Critical data drift detected! Immediate model retraining required.",
        "action_required": "Trigger model retraining pipeline",
        "timestamp": datetime.now().isoformat(),
        "metrics": drift_metrics
    }

    print(f"CRITICAL ALERT: {json.dumps(alert, indent=2)}")

    # В реальном сценарии:
    # - Отправка в PagerDuty/OpsGenie
    # - Отправка в Slack с @channel
    # - Отправка email

    context["ti"].xcom_push(key="alert", value=alert)

    return alert


def send_warning_alert(**context):
    """
    Отправка предупреждающего алерта
    """
    drift_metrics = context["ti"].xcom_pull(
        task_ids="calculate_drift_metrics",
        key="return_value"
    )

    alert = {
        "severity": "WARNING",
        "type": "data_drift",
        "drift_score": drift_metrics.get("overall_drift_score", 0),
        "message": "Moderate data drift detected. Schedule model retraining.",
        "action_required": "Review drift metrics and plan retraining",
        "timestamp": datetime.now().isoformat(),
        "metrics": drift_metrics
    }

    print(f"WARNING ALERT: {json.dumps(alert, indent=2)}")

    # В реальном сценарии - отправка в Slack без @channel

    context["ti"].xcom_push(key="alert", value=alert)

    return alert


def log_healthy_status(**context):
    """
    Логирование нормального состояния
    """
    drift_metrics = context["ti"].xcom_pull(
        task_ids="calculate_drift_metrics",
        key="return_value"
    )

    status = {
        "status": "HEALTHY",
        "drift_score": drift_metrics.get("overall_drift_score", 0),
        "message": "No significant drift detected. Model is stable.",
        "timestamp": datetime.now().isoformat()
    }

    print(f"HEALTHY STATUS: {json.dumps(status, indent=2)}")

    return status


def record_metrics(**context):
    """
    Запись метрик для мониторинга
    """
    drift_metrics = context["ti"].xcom_pull(
        task_ids="calculate_drift_metrics",
        key="return_value"
    )

    # Запись в Prometheus/InfluxDB
    metrics_record = {
        "metric": "forte_drift_score",
        "value": drift_metrics.get("overall_drift_score", 0),
        "timestamp": datetime.now().isoformat(),
        "labels": {
            "model_version": drift_metrics.get("model_version", "unknown"),
            "check_type": "scheduled_6h"
        }
    }

    print(f"Recording metrics: {json.dumps(metrics_record, indent=2)}")

    # В реальном сценарии - отправка в Prometheus Pushgateway

    return metrics_record


# Создание DAG
with DAG(
    dag_id="forte_drift_monitoring",
    default_args=default_args,
    description="Monitor data drift every 6 hours",
    schedule_interval="0 */6 * * *",  # Каждые 6 часов
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["ml", "monitoring", "drift"],
    max_active_runs=1,
) as dag:

    # Task 1: Сбор транзакций
    collect_data = PythonOperator(
        task_id="collect_recent_transactions",
        python_callable=collect_recent_transactions,
    )

    # Task 2: Расчёт drift
    calc_drift = PythonOperator(
        task_id="calculate_drift_metrics",
        python_callable=calculate_drift_metrics,
    )

    # Task 3: Оценка severity
    evaluate = BranchPythonOperator(
        task_id="evaluate_drift_severity",
        python_callable=evaluate_drift_severity,
    )

    # Task 4a: Критический алерт
    critical_alert = PythonOperator(
        task_id="send_critical_alert",
        python_callable=send_critical_alert,
    )

    # Task 4b: Предупреждение
    warning_alert = PythonOperator(
        task_id="send_warning_alert",
        python_callable=send_warning_alert,
    )

    # Task 4c: Нормальный статус
    healthy_status = PythonOperator(
        task_id="log_healthy_status",
        python_callable=log_healthy_status,
    )

    # Task 5: Триггер переобучения (при критическом drift)
    trigger_training = TriggerDagRunOperator(
        task_id="trigger_retraining",
        trigger_dag_id="forte_daily_training",
        wait_for_completion=False,
        reset_dag_run=True,
        conf={"triggered_by": "drift_monitoring", "drift_detected": True},
    )

    # Task 6: Запись метрик
    record = PythonOperator(
        task_id="record_metrics",
        python_callable=record_metrics,
        trigger_rule="all_done",
    )

    # Зависимости
    collect_data >> calc_drift >> evaluate

    evaluate >> critical_alert >> trigger_training >> record
    evaluate >> warning_alert >> record
    evaluate >> healthy_status >> record
