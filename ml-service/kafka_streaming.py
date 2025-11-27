"""
Forte.AI Kafka Streaming Service
Real-time обработка транзакций через Kafka
"""

import json
import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import os
from dataclasses import dataclass, asdict

from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError

import requests
import numpy as np

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kafka_streaming")


@dataclass
class Transaction:
    """Структура транзакции"""
    transaction_id: str
    cst_dim_id: str
    amount: float
    hour: int
    day_of_week: int
    direction: str
    monthly_os_changes: int = 0
    monthly_phone_model_changes: int = 0
    last_phone_model: str = "Unknown"
    last_os: str = "Unknown"
    logins_last_7_days: int = 0
    logins_last_30_days: int = 0
    login_frequency_7d: float = 0.0
    login_frequency_30d: float = 0.0
    freq_change_7d_vs_mean: float = 0.0
    logins_7d_over_30d_ratio: float = 0.0
    avg_login_interval_30d: float = 0.0
    std_login_interval_30d: float = 0.0
    var_login_interval_30d: float = 0.0
    ewm_login_interval_7d: float = 0.0
    burstiness_login_interval: float = 0.0
    fano_factor_login_interval: float = 0.0
    zscore_avg_login_interval_7d: float = 0.0
    timestamp: str = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()


@dataclass
class ScoredTransaction:
    """Транзакция с оценкой риска"""
    transaction_id: str
    cst_dim_id: str
    amount: float
    fraud_probability: float
    fraud_score: float
    risk_level: str
    should_block: bool
    top_risk_factors: list
    processed_at: str
    processing_time_ms: float


class KafkaConfig:
    """Конфигурация Kafka"""
    BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

    # Topics
    TOPIC_TRANSACTIONS_RAW = "transactions_raw"
    TOPIC_TRANSACTIONS_SCORED = "transactions_scored"
    TOPIC_FRAUD_ALERTS = "fraud_alerts"
    TOPIC_MODEL_METRICS = "model_metrics"

    # Consumer config
    CONSUMER_GROUP = "fraud_detection_group"
    AUTO_OFFSET_RESET = "latest"

    # Producer config
    ACKS = "all"
    RETRIES = 3


class FraudStreamProcessor:
    """
    Kafka Stream Processor для детекции мошенничества в реальном времени
    """

    def __init__(
        self,
        ml_service_url: str = "http://localhost:8000",
        kafka_servers: str = None
    ):
        self.ml_service_url = ml_service_url
        self.kafka_servers = kafka_servers or KafkaConfig.BOOTSTRAP_SERVERS

        self.consumer: Optional[KafkaConsumer] = None
        self.producer: Optional[KafkaProducer] = None

        self.running = False
        self.processed_count = 0
        self.blocked_count = 0
        self.error_count = 0

    def connect(self) -> bool:
        """Подключение к Kafka"""
        try:
            # Consumer для сырых транзакций
            self.consumer = KafkaConsumer(
                KafkaConfig.TOPIC_TRANSACTIONS_RAW,
                bootstrap_servers=self.kafka_servers.split(","),
                group_id=KafkaConfig.CONSUMER_GROUP,
                auto_offset_reset=KafkaConfig.AUTO_OFFSET_RESET,
                value_deserializer=lambda x: json.loads(x.decode("utf-8")),
                enable_auto_commit=True,
                max_poll_records=100
            )

            # Producer для scored транзакций и алертов
            self.producer = KafkaProducer(
                bootstrap_servers=self.kafka_servers.split(","),
                value_serializer=lambda x: json.dumps(x).encode("utf-8"),
                acks=KafkaConfig.ACKS,
                retries=KafkaConfig.RETRIES
            )

            logger.info(f"Connected to Kafka: {self.kafka_servers}")
            return True

        except KafkaError as e:
            logger.error(f"Failed to connect to Kafka: {e}")
            return False

    def disconnect(self):
        """Отключение от Kafka"""
        if self.consumer:
            self.consumer.close()
        if self.producer:
            self.producer.close()
        logger.info("Disconnected from Kafka")

    def score_transaction(self, transaction: Transaction) -> Dict[str, Any]:
        """Отправка транзакции в ML сервис для скоринга"""
        import time
        start_time = time.time()

        try:
            # Подготовка данных для API
            payload = {
                "amount": transaction.amount,
                "hour": transaction.hour,
                "day_of_week": transaction.day_of_week,
                "direction": transaction.direction,
                "monthly_os_changes": transaction.monthly_os_changes,
                "monthly_phone_model_changes": transaction.monthly_phone_model_changes,
                "last_phone_model": transaction.last_phone_model,
                "last_os": transaction.last_os,
                "logins_last_7_days": transaction.logins_last_7_days,
                "logins_last_30_days": transaction.logins_last_30_days,
                "login_frequency_7d": transaction.login_frequency_7d,
                "login_frequency_30d": transaction.login_frequency_30d,
                "freq_change_7d_vs_mean": transaction.freq_change_7d_vs_mean,
                "logins_7d_over_30d_ratio": transaction.logins_7d_over_30d_ratio,
                "avg_login_interval_30d": transaction.avg_login_interval_30d,
                "std_login_interval_30d": transaction.std_login_interval_30d,
                "var_login_interval_30d": transaction.var_login_interval_30d,
                "ewm_login_interval_7d": transaction.ewm_login_interval_7d,
                "burstiness_login_interval": transaction.burstiness_login_interval,
                "fano_factor_login_interval": transaction.fano_factor_login_interval,
                "zscore_avg_login_interval_7d": transaction.zscore_avg_login_interval_7d
            }

            response = requests.post(
                f"{self.ml_service_url}/predict",
                json=payload,
                timeout=5
            )
            response.raise_for_status()

            result = response.json()
            processing_time = (time.time() - start_time) * 1000

            return {
                "success": True,
                "fraud_probability": result["fraud_probability"],
                "fraud_score": result["fraud_score"],
                "risk_level": result["risk_level"],
                "should_block": result["should_block"],
                "top_risk_factors": result.get("top_risk_factors", [])[:5],
                "processing_time_ms": processing_time
            }

        except Exception as e:
            logger.error(f"Error scoring transaction {transaction.transaction_id}: {e}")
            return {
                "success": False,
                "fraud_probability": 1.0,
                "fraud_score": 100.0,
                "risk_level": "CRITICAL",
                "should_block": True,
                "top_risk_factors": [{"feature": "error", "impact": 1.0}],
                "processing_time_ms": (time.time() - start_time) * 1000,
                "error": str(e)
            }

    def publish_scored_transaction(self, scored: ScoredTransaction):
        """Публикация scored транзакции"""
        try:
            self.producer.send(
                KafkaConfig.TOPIC_TRANSACTIONS_SCORED,
                value=asdict(scored)
            )
        except KafkaError as e:
            logger.error(f"Failed to publish scored transaction: {e}")

    def publish_alert(self, scored: ScoredTransaction, transaction: Transaction):
        """Публикация алерта о мошенничестве"""
        try:
            alert = {
                "alert_id": f"ALERT_{scored.transaction_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "transaction_id": scored.transaction_id,
                "customer_id": transaction.cst_dim_id,
                "amount": transaction.amount,
                "fraud_score": scored.fraud_score,
                "risk_level": scored.risk_level,
                "top_factors": scored.top_risk_factors[:3],
                "action": "BLOCKED" if scored.should_block else "FLAGGED",
                "timestamp": datetime.now().isoformat(),
                "requires_review": scored.risk_level in ["HIGH", "CRITICAL"]
            }

            self.producer.send(
                KafkaConfig.TOPIC_FRAUD_ALERTS,
                value=alert
            )

            logger.warning(f"FRAUD ALERT: {alert['alert_id']} - Score: {scored.fraud_score:.1f}")

        except KafkaError as e:
            logger.error(f"Failed to publish alert: {e}")

    def publish_metrics(self):
        """Публикация метрик обработки"""
        try:
            metrics = {
                "timestamp": datetime.now().isoformat(),
                "processed_count": self.processed_count,
                "blocked_count": self.blocked_count,
                "error_count": self.error_count,
                "block_rate": self.blocked_count / max(self.processed_count, 1) * 100
            }

            self.producer.send(
                KafkaConfig.TOPIC_MODEL_METRICS,
                value=metrics
            )

        except KafkaError as e:
            logger.error(f"Failed to publish metrics: {e}")

    def process_message(self, message) -> Optional[ScoredTransaction]:
        """Обработка одного сообщения"""
        try:
            data = message.value

            # Создаём объект транзакции
            transaction = Transaction(
                transaction_id=data.get("transaction_id", f"TXN_{datetime.now().timestamp()}"),
                cst_dim_id=data.get("cst_dim_id", "unknown"),
                amount=float(data.get("amount", 0)),
                hour=int(data.get("hour", datetime.now().hour)),
                day_of_week=int(data.get("day_of_week", datetime.now().weekday())),
                direction=data.get("direction", "unknown"),
                monthly_os_changes=int(data.get("monthly_os_changes", 0)),
                monthly_phone_model_changes=int(data.get("monthly_phone_model_changes", 0)),
                last_phone_model=data.get("last_phone_model", "Unknown"),
                last_os=data.get("last_os", "Unknown"),
                logins_last_7_days=int(data.get("logins_last_7_days", 0)),
                logins_last_30_days=int(data.get("logins_last_30_days", 0)),
                login_frequency_7d=float(data.get("login_frequency_7d", 0)),
                login_frequency_30d=float(data.get("login_frequency_30d", 0)),
                freq_change_7d_vs_mean=float(data.get("freq_change_7d_vs_mean", 0)),
                logins_7d_over_30d_ratio=float(data.get("logins_7d_over_30d_ratio", 0)),
                avg_login_interval_30d=float(data.get("avg_login_interval_30d", 0)),
                std_login_interval_30d=float(data.get("std_login_interval_30d", 0)),
                var_login_interval_30d=float(data.get("var_login_interval_30d", 0)),
                ewm_login_interval_7d=float(data.get("ewm_login_interval_7d", 0)),
                burstiness_login_interval=float(data.get("burstiness_login_interval", 0)),
                fano_factor_login_interval=float(data.get("fano_factor_login_interval", 0)),
                zscore_avg_login_interval_7d=float(data.get("zscore_avg_login_interval_7d", 0))
            )

            # Скоринг
            score_result = self.score_transaction(transaction)

            # Создаём scored транзакцию
            scored = ScoredTransaction(
                transaction_id=transaction.transaction_id,
                cst_dim_id=transaction.cst_dim_id,
                amount=transaction.amount,
                fraud_probability=score_result["fraud_probability"],
                fraud_score=score_result["fraud_score"],
                risk_level=score_result["risk_level"],
                should_block=score_result["should_block"],
                top_risk_factors=score_result["top_risk_factors"],
                processed_at=datetime.now().isoformat(),
                processing_time_ms=score_result["processing_time_ms"]
            )

            # Публикуем результат
            self.publish_scored_transaction(scored)

            # Если высокий риск - алерт
            if scored.risk_level in ["HIGH", "CRITICAL"]:
                self.publish_alert(scored, transaction)

            # Обновляем счётчики
            self.processed_count += 1
            if scored.should_block:
                self.blocked_count += 1

            if not score_result.get("success", True):
                self.error_count += 1

            return scored

        except Exception as e:
            logger.error(f"Error processing message: {e}")
            self.error_count += 1
            return None

    def run(self):
        """Запуск stream processing"""
        if not self.connect():
            raise RuntimeError("Failed to connect to Kafka")

        self.running = True
        logger.info("Starting Kafka stream processor...")

        metrics_interval = 100  # Публикуем метрики каждые 100 сообщений

        try:
            while self.running:
                # Poll for messages
                messages = self.consumer.poll(timeout_ms=1000)

                for topic_partition, records in messages.items():
                    for record in records:
                        scored = self.process_message(record)

                        if scored:
                            logger.info(
                                f"Processed: {scored.transaction_id} | "
                                f"Score: {scored.fraud_score:.1f} | "
                                f"Risk: {scored.risk_level} | "
                                f"Time: {scored.processing_time_ms:.1f}ms"
                            )

                # Публикуем метрики периодически
                if self.processed_count > 0 and self.processed_count % metrics_interval == 0:
                    self.publish_metrics()

        except KeyboardInterrupt:
            logger.info("Stopping stream processor...")
        finally:
            self.running = False
            self.publish_metrics()  # Финальные метрики
            self.disconnect()

    def stop(self):
        """Остановка обработки"""
        self.running = False


def main():
    """Запуск Kafka Stream Processor"""
    print("=" * 60)
    print("Forte.AI - Kafka Stream Processor")
    print("=" * 60)

    ml_service_url = os.getenv("ML_SERVICE_URL", "http://localhost:8000")
    kafka_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

    print(f"\n[CONFIG]")
    print(f"  ML Service: {ml_service_url}")
    print(f"  Kafka: {kafka_servers}")
    print(f"\n[TOPICS]")
    print(f"  Input:  {KafkaConfig.TOPIC_TRANSACTIONS_RAW}")
    print(f"  Output: {KafkaConfig.TOPIC_TRANSACTIONS_SCORED}")
    print(f"  Alerts: {KafkaConfig.TOPIC_FRAUD_ALERTS}")
    print()

    processor = FraudStreamProcessor(
        ml_service_url=ml_service_url,
        kafka_servers=kafka_servers
    )

    processor.run()


if __name__ == "__main__":
    main()
