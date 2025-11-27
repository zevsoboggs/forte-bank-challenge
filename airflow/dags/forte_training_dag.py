"""
Forte.AI - Daily Model Training DAG
Автоматическое переобучение модели по расписанию
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.operators.bash import BashOperator
from airflow.operators.empty import EmptyOperator
from airflow.utils.trigger_rule import TriggerRule
import requests
import json
import os

# Конфигурация
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://ml-service:8000")
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
DRIFT_THRESHOLD = 0.3  # Порог для переобучения

default_args = {
    "owner": "forte-mlops",
    "depends_on_past": False,
    "email": ["mlops@forte.kz"],
    "email_on_failure": True,
    "email_on_retry": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
}


def check_data_drift(**context):
    """
    Проверка data drift для определения необходимости переобучения
    """
    try:
        # Получаем последние транзакции для проверки drift
        response = requests.get(
            f"{ML_SERVICE_URL}/drift/check",
            timeout=30
        )

        if response.status_code == 400:
            # Нет baseline - нужно установить
            print("No baseline set, will train new model")
            return {
                "drift_detected": True,
                "drift_score": 1.0,
                "reason": "No baseline set"
            }

        result = response.json()

        # Сохраняем результат в XCom
        context["ti"].xcom_push(key="drift_result", value=result)

        print(f"Drift check result: {json.dumps(result, indent=2)}")

        return result

    except Exception as e:
        print(f"Error checking drift: {e}")
        # При ошибке - обучаем модель
        return {
            "drift_detected": True,
            "drift_score": 1.0,
            "reason": f"Error: {str(e)}"
        }


def decide_training(**context):
    """
    Решение о необходимости переобучения
    """
    drift_result = context["ti"].xcom_pull(
        task_ids="check_data_drift",
        key="return_value"
    )

    if drift_result is None:
        print("No drift result, proceeding with training")
        return "train_model"

    drift_detected = drift_result.get("drift_detected", False)
    drift_score = drift_result.get("drift_score", 0)
    reason = drift_result.get("reason", "")

    print(f"Drift detected: {drift_detected}, Score: {drift_score}, Reason: {reason}")

    # Always train if manually triggered or if drift detected
    dag_run = context.get("dag_run")
    if dag_run and dag_run.run_type == "manual":
        print("Manual run detected - forcing training")
        return "train_model"

    if drift_detected or drift_score > DRIFT_THRESHOLD:
        return "train_model"
    else:
        return "skip_training"


def extract_training_data(**context):
    """
    Извлечение данных для обучения
    """
    print("Extracting training data from database...")

    # В реальном сценарии здесь был бы запрос к БД
    # Сейчас используем существующие CSV файлы

    data_info = {
        "behavioral_path": "/app/data/поведенческие паттерны клиентов.csv",
        "transactions_path": "/app/data/транзакции в Мобильном интернет Банкинге.csv",
        "extracted_at": datetime.now().isoformat()
    }

    context["ti"].xcom_push(key="data_info", value=data_info)

    print(f"Data extraction complete: {json.dumps(data_info, indent=2)}")

    return data_info


def run_feature_engineering(**context):
    """
    Feature engineering pipeline
    """
    print("Running feature engineering...")

    data_info = context["ti"].xcom_pull(
        task_ids="extract_training_data",
        key="return_value"
    )

    # В реальном сценарии здесь был бы код feature engineering
    # Сейчас это выполняется внутри train_model.py

    feature_info = {
        "num_features": 26,
        "feature_groups": ["transactional", "behavioral", "device"],
        "processed_at": datetime.now().isoformat()
    }

    print(f"Feature engineering complete: {json.dumps(feature_info, indent=2)}")

    return feature_info


def train_model(**context):
    """
    Обучение модели через API ML Service
    MLflow трекинг происходит внутри ML Service
    """
    print("Starting model training via ML Service API...")
    print(f"ML Service URL: {ML_SERVICE_URL}")

    try:
        # Вызываем эндпоинт обучения в ML Service
        response = requests.post(
            f"{ML_SERVICE_URL}/train",
            timeout=3600  # 1 час таймаут
        )

        result = response.json()
        print(f"Training response: {json.dumps(result, indent=2)}")

        if result.get("status") == "failed":
            raise Exception(f"Training failed: {result.get('message')}")

        if result.get("status") == "timeout":
            raise Exception("Training timeout exceeded (1 hour)")

        # Сохраняем результаты
        training_result = {
            "status": result.get("status", "success"),
            "model_version": result.get("model_version"),
            "mlflow_run_id": result.get("mlflow_run_id"),
            "trained_at": datetime.now().isoformat()
        }

        context["ti"].xcom_push(key="training_result", value=training_result)

        print(f"Training completed! Model version: {training_result.get('model_version')}")
        print(f"MLflow Run ID: {training_result.get('mlflow_run_id')}")

        return training_result

    except requests.exceptions.Timeout:
        raise Exception("Training request timeout exceeded (1 hour)")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to connect to ML Service: {str(e)}")
    except Exception as e:
        raise Exception(f"Training failed: {str(e)}")


def validate_model(**context):
    """
    Валидация обученной модели
    """
    print("Validating trained model...")

    try:
        # Получаем метрики модели
        response = requests.get(f"{ML_SERVICE_URL}/model-info", timeout=30)
        response.raise_for_status()

        model_info = response.json()
        metrics = model_info.get("metrics", {})

        print(f"Model info: {json.dumps(model_info, indent=2)}")

        # Проверяем метрики
        test_scores = metrics.get("test_scores", {})
        roc_auc = test_scores.get("roc_auc", 0)
        f1_score = test_scores.get("f1_score", 0)

        validation_result = {
            "roc_auc": roc_auc,
            "f1_score": f1_score,
            "passed": roc_auc >= 0.75 and f1_score >= 0.60,
            "validated_at": datetime.now().isoformat()
        }

        context["ti"].xcom_push(key="validation_result", value=validation_result)

        if not validation_result["passed"]:
            raise Exception(
                f"Model validation failed: ROC-AUC={roc_auc:.4f}, F1={f1_score:.4f}"
            )

        print(f"Model validation passed: {json.dumps(validation_result, indent=2)}")

        return validation_result

    except Exception as e:
        raise Exception(f"Validation failed: {str(e)}")


def deploy_model(**context):
    """
    Деплой модели в production
    """
    print("Deploying model to production...")

    validation_result = context["ti"].xcom_pull(
        task_ids="validate_model",
        key="return_value"
    )

    if not validation_result or not validation_result.get("passed"):
        raise Exception("Cannot deploy: validation not passed")

    try:
        # Перезагрузка модели в сервисе
        response = requests.post(
            f"{ML_SERVICE_URL}/reload-model",
            timeout=60
        )

        # Если endpoint не существует, это ОК - модель загрузится при рестарте
        if response.status_code == 404:
            print("Reload endpoint not found, model will be loaded on restart")
        else:
            response.raise_for_status()

        deploy_result = {
            "status": "deployed",
            "deployed_at": datetime.now().isoformat(),
            "metrics": validation_result
        }

        print(f"Deployment complete: {json.dumps(deploy_result, indent=2)}")

        return deploy_result

    except Exception as e:
        print(f"Warning during deployment: {e}")
        return {
            "status": "deployed_with_warnings",
            "deployed_at": datetime.now().isoformat(),
            "warning": str(e)
        }


def update_baseline(**context):
    """
    Обновление baseline для drift monitoring
    """
    print("Updating drift baseline...")

    try:
        # Устанавливаем новый baseline на основе текущих данных
        # В реальном сценарии передавали бы данные
        response = requests.post(
            f"{ML_SERVICE_URL}/drift/set-baseline",
            json=[],  # Пустой список - сервис использует последние данные
            timeout=60
        )

        if response.status_code != 400:  # 400 = не хватает данных
            print(f"Baseline update response: {response.json()}")

        return {"status": "baseline_updated"}

    except Exception as e:
        print(f"Warning updating baseline: {e}")
        return {"status": "baseline_update_skipped", "reason": str(e)}


def send_notification(**context):
    """
    Отправка уведомления о результатах
    """
    training_result = context["ti"].xcom_pull(
        task_ids="train_model",
        key="return_value"
    )
    validation_result = context["ti"].xcom_pull(
        task_ids="validate_model",
        key="return_value"
    )

    notification = {
        "event": "model_training_complete",
        "timestamp": datetime.now().isoformat(),
        "training": training_result,
        "validation": validation_result,
        "dag_run_id": context["run_id"]
    }

    print(f"Notification: {json.dumps(notification, indent=2)}")

    # В реальном сценарии здесь отправка в Slack/Telegram/Email

    return notification


# Создание DAG
with DAG(
    dag_id="forte_daily_training",
    default_args=default_args,
    description="Daily ML model training pipeline for fraud detection",
    schedule_interval="0 2 * * *",  # Каждый день в 2:00
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["ml", "training", "fraud-detection"],
    max_active_runs=1,
) as dag:

    # Task 1: Проверка drift
    check_drift = PythonOperator(
        task_id="check_data_drift",
        python_callable=check_data_drift,
    )

    # Task 2: Решение о переобучении
    decide = BranchPythonOperator(
        task_id="decide_training",
        python_callable=decide_training,
    )

    # Task 3a: Пропуск обучения
    skip = EmptyOperator(
        task_id="skip_training",
    )

    # Task 3b: Извлечение данных
    extract_data = PythonOperator(
        task_id="extract_training_data",
        python_callable=extract_training_data,
    )

    # Task 4: Feature Engineering
    feature_eng = PythonOperator(
        task_id="run_feature_engineering",
        python_callable=run_feature_engineering,
    )

    # Task 5: Обучение модели
    train = PythonOperator(
        task_id="train_model",
        python_callable=train_model,
    )

    # Task 6: Валидация
    validate = PythonOperator(
        task_id="validate_model",
        python_callable=validate_model,
    )

    # Task 7: Деплой
    deploy = PythonOperator(
        task_id="deploy_model",
        python_callable=deploy_model,
    )

    # Task 8: Обновление baseline
    update_base = PythonOperator(
        task_id="update_baseline",
        python_callable=update_baseline,
    )

    # Task 9: Уведомление (выполняется всегда)
    notify = PythonOperator(
        task_id="send_notification",
        python_callable=send_notification,
        trigger_rule=TriggerRule.ALL_DONE,
    )

    # Определение зависимостей
    check_drift >> decide

    decide >> skip >> notify
    decide >> extract_data >> feature_eng >> train >> validate >> deploy >> update_base >> notify
