from openai import AsyncOpenAI
import hashlib
from typing import List, Dict, Any, Tuple
from app.core.config import settings
from app.core.logging import logger
from app.schemas.transaction import TransactionFeatures

class AIService:
    def __init__(self):
        self.client = None
        if settings.OPENAI_API_KEY:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            logger.warning("OPENAI_API_KEY not found. AI analysis will be disabled.")

    async def analyze_transaction(
        self,
        transaction: TransactionFeatures,
        probability: float,
        risk_level: str,
        top_factors: List[Dict[str, Any]]
    ) -> Tuple[str, str, str, str]:
        """Get AI analysis for the transaction"""
        if not self.client:
            return None, None, None, None

        try:
            fraud_prompt = self._build_fraud_prompt(transaction, probability, risk_level, top_factors)
            aml_prompt = self._build_aml_prompt(transaction, risk_level)

            # Run requests in parallel
            import asyncio
            fraud_response, aml_response = await asyncio.gather(
                self.client.chat.completions.create(
                    model=settings.OPENAI_MODEL_FRAUD,
                    messages=[
                        {"role": "system", "content": "Ты - эксперт по антифроду в мобильном банкинге. Анализируй транзакции кратко и точно."},
                        {"role": "user", "content": fraud_prompt}
                    ],
                    max_tokens=500,
                    temperature=0.3
                ),
                self.client.chat.completions.create(
                    model=settings.OPENAI_MODEL_AML,
                    messages=[
                        {"role": "system", "content": "Ты - эксперт по AML (Anti-Money Laundering). Выявляй схемы отмывания денег."},
                        {"role": "user", "content": aml_prompt}
                    ],
                    max_tokens=600,
                    temperature=0.3
                )
            )

            fraud_analysis = fraud_response.choices[0].message.content
            aml_analysis = aml_response.choices[0].message.content

            # Parse fraud analysis
            parts = fraud_analysis.split("**Рекомендация")
            ai_analysis = parts[0].replace("**Краткий анализ**", "").strip()
            recommendation = ""
            if len(parts) > 1:
                recommendation = parts[1].replace(":**", "").replace("**:", "").strip()

            # Generate fingerprint
            fingerprint_data = f"{transaction.amount}_{transaction.hour}_{probability}_{risk_level}_{ai_analysis}_{aml_analysis}"
            fingerprint = hashlib.sha256(fingerprint_data.encode()).hexdigest()[:16]

            return ai_analysis, aml_analysis, recommendation, fingerprint

        except Exception as e:
            logger.error(f"Error in AI analysis: {e}")
            return None, None, None, None

    def _build_fraud_prompt(self, t: TransactionFeatures, prob: float, risk: str, factors: List[Dict]) -> str:
        factors_str = "\n".join([f"- {f['feature']}: {f['impact']:.3f}" for f in factors[:5]])
        return f"""Ты - эксперт по анализу мошеннических транзакций в банковской системе Forte.AI.

Проанализируй следующую транзакцию:

**Данные транзакции:**
- Сумма: {t.amount} тенге
- Время: {t.hour}:00, день недели: {t.day_of_week}
- Активность входов за 7 дней: {t.logins_last_7_days}
- Активность входов за 30 дней: {t.logins_last_30_days}
- Изменения устройств за месяц: {t.monthly_phone_model_changes}
- Изменения ОС за месяц: {t.monthly_os_changes}

**Результаты ML-модели:**
- Вероятность мошенничества: {prob:.1%}
- Уровень риска: {risk}

**Топ факторы риска:**
{factors_str}

Предоставь:
1. **Краткий анализ** (2-3 предложения): почему эта транзакция имеет такой уровень риска?
2. **Рекомендацию** (1-2 предложения): что должен сделать аналитик?

Будь конкретным и профессиональным. Отвечай на русском языке."""

    def _build_aml_prompt(self, t: TransactionFeatures, risk: str) -> str:
        return f"""Ты - эксперт по AML (Anti-Money Laundering) в финансовой системе.

Проанализируй транзакцию на признаки отмывания денег:

**Данные транзакции:**
- Сумма: {t.amount} тенге
- Время: {t.hour}:00, день недели: {t.day_of_week}
- Направление: {t.direction}
- Частота входов (7 дней): {t.logins_last_7_days}
- Частота входов (30 дней): {t.logins_last_30_days}
- Изменения устройств: {t.monthly_phone_model_changes}
- Изменения ОС: {t.monthly_os_changes}

**ML Risk Level:** {risk}

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

ai_service = AIService()
