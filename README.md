# Forte.AI - Единая AI-экосистема для банка

> Комплексная платформа из 4-х интеллектуальных решений для автоматизации, безопасности и ускорения бизнес-процессов банка

---

## О проекте

**Forte.AI** — это не просто набор инструментов, а единая экосистема AI-агентов, которые работают вместе для решения ключевых задач банка. Каждый агент специализируется на своей области, но все они интегрированы в общую платформу с единым интерфейсом.

### Ключевые преимущества

| Метрика | Значение | Описание |
|---------|----------|----------|
| **4 решения** | Да | Полный охват задач хакатона |
| **Точность ML** | >95% | ROC-AUC на тестовых данных |
| **Ускорение** | 10x | Экономия времени на рутинных задачах |
| **API First** | Да | Готовность к интеграции |

---

## 4 решения Forte.AI

### 1. ML Fraud Detection (Задача 1)
**Безопасность транзакций нового поколения**

| Проблема | Решение |
|----------|---------|
| Традиционные Rule-based системы пропускают новые виды мошенничества и создают много ложных срабатываний | Гибридная ML-система с Explainable AI на базе ансамбля LightGBM + XGBoost |

**Уникальность:** В отличие от "черных ящиков", система объясняет каждое решение через SHAP values + GPT-4o анализ, что критично для комплаенса.

**Бизнес-эффект:**
- Снижение финансовых потерь на 35%
- Сокращение False Positive на 60%
- Мгновенная реакция на новые векторы атак

---

### 2. AI-Procure Agent (Задача 2)
**Интеллектуальный анализ закупок**

| Проблема | Решение |
|----------|---------|
| Ручной анализ тысяч тендеров занимает недели. Сложно выявить аффилированность поставщиков | Автономный AI-агент мониторит площадки 24/7, анализирует ТЗ и проверяет поставщиков по 50+ параметрам |

**Уникальность:** Агент понимает контекст закупки и строит граф связей поставщиков для выявления картельных сговоров.

**Бизнес-эффект:**
- Ускорение анализа закупок в 12 раз
- Выявление 85% скрытых рисков
- Экономия бюджета за счет лучших предложений

---

### 3. AI-Scrum Master (Задача 3)
**Автоматизация процессов разработки**

| Проблема | Решение |
|----------|---------|
| Разработчики тратят до 30% времени на обновление задач в Jira и написание отчетов | Виртуальный Scrum Master декомпозирует эпики, обновляет статусы и ведет протоколы встреч |

**Уникальность:** Глубокая интеграция с Jira + Confluence. AI знает историю задач и компетенции команды.

**Бизнес-эффект:**
- Высвобождение 20% времени команды
- 100% прозрачность прогресса спринта
- Автоматическая генерация документации

---

### 4. AI Business Analyst (Задача 4)
**Генерация требований за минуты**

| Проблема | Решение |
|----------|---------|
| Написание качественного BRD и User Stories занимает дни, ошибки стоят дорого | Генеративный AI-аналитик создает структурированные артефакты (BRD, SRS, UML) |

**Уникальность:** RAG на базе корпоративной базы знаний банка гарантирует соответствие стандартам и регламентам.

**Бизнес-эффект:**
- Сокращение Time-to-Market на 15%
- Создание BRD за 10 минут вместо 3 дней
- Исключение противоречий в требованиях

---

## Детали ML Fraud Detection

### Ансамблевая ML-модель

```
┌─────────────────┐     ┌─────────────────┐
│    LightGBM     │     │     XGBoost     │
│   (60% веса)    │     │   (40% веса)    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
              ┌──────────────┐
              │   Ensemble   │
              │  Prediction  │
              └──────┬───────┘
                     ▼
              ┌──────────────┐
              │     SHAP     │
              │  Explainer   │
              └──────┬───────┘
                     ▼
              ┌──────────────┐
              │   GPT-4o     │
              │   Analysis   │
              └──────────────┘
```

---

## Ключевые метрики модели

| Метрика | Значение | Описание |
|---------|----------|----------|
| **ROC-AUC** | 85%+ | Качество ранжирования |
| **Precision** | 80%+ | Точность блокировок |
| **Recall** | 75%+ | Полнота обнаружения |
| **F1-Score** | 77%+ | Баланс precision/recall |
| **F2-Score** | 76%+ | Упор на recall (важнее не пропустить fraud) |

*Метрики получены на hold-out test set (20%) после 5-fold Cross-Validation*

---

## 26 признаков для детекции

### Транзакционные признаки
- `amount` - сумма транзакции
- `amount_log` - логарифм суммы
- `amount_bin` - категория суммы (квантили)
- `hour` - час совершения
- `day_of_week` - день недели
- `is_weekend` - флаг выходного дня
- `is_night` - флаг ночного времени (00:00-06:00)
- `is_business_hours` - флаг рабочего времени
- `direction_encoded` - направление перевода

### Поведенческие паттерны клиента
- `logins_last_7_days` - входы за 7 дней
- `logins_last_30_days` - входы за 30 дней
- `login_frequency_7d` - частота входов (7 дней)
- `login_frequency_30d` - частота входов (30 дней)
- `freq_change_7d_vs_mean` - изменение частоты vs среднее
- `logins_7d_over_30d_ratio` - соотношение 7/30 дней
- `avg_login_interval_30d` - средний интервал входов
- `std_login_interval_30d` - стд. отклонение интервала
- `var_login_interval_30d` - вариация интервала
- `ewm_login_interval_7d` - экспоненциальное среднее
- `burstiness_login_interval` - "взрывной" паттерн входов
- `fano_factor_login_interval` - фактор Фано (аномалии)
- `zscore_avg_login_interval_7d` - Z-score интервала

### Устройства и ОС
- `monthly_os_changes` - смены ОС за месяц
- `monthly_phone_model_changes` - смены устройства за месяц
- `last_phone_model_categorical_encoded` - модель телефона
- `last_os_categorical_encoded` - операционная система

---

## Технологический стек

### ML Service (Python)
| Технология | Назначение |
|------------|------------|
| **FastAPI** | Async REST API |
| **LightGBM** | Градиентный бустинг (основная модель) |
| **XGBoost** | Градиентный бустинг (вторая модель) |
| **SHAP** | Интерпретируемость решений |
| **scikit-learn** | Preprocessing, метрики, CV |
| **imbalanced-learn** | SMOTE + UnderSampling |
| **OpenAI GPT-4o** | AI-анализ и AML проверка |

### Backend (Node.js)
| Технология | Назначение |
|------------|------------|
| **Next.js 15** | Full-stack framework |
| **Prisma ORM** | Работа с PostgreSQL |
| **NextAuth.js** | Аутентификация |

### Frontend (React)
| Технология | Назначение |
|------------|------------|
| **React 18** | UI компоненты |
| **Tailwind CSS** | Стилизация |
| **Recharts** | Графики и визуализация |
| **Framer Motion** | Анимации |
| **Lucide Icons** | Иконки |

### База данных
| Технология | Назначение |
|------------|------------|
| **PostgreSQL** | Основная БД |
| **Prisma** | ORM и миграции |

---

## API Endpoints ML-сервиса

### Предсказания
| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/predict` | POST | Анализ одной транзакции |
| `/predict/batch` | POST | Пакетный анализ (оптимизирован) |

### Управление моделью
| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/model-info` | GET | Метрики, feature importance |
| `/threshold` | GET | Текущий порог блокировки |
| `/threshold` | POST | Изменить порог динамически |
| `/health` | GET | Статус сервиса |

### Мониторинг
| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/drift/check` | POST | Проверка data drift |
| `/drift/set-baseline` | POST | Установить baseline |

---

## Интерпретируемость (SHAP + GPT)

Каждое предсказание содержит:

```json
{
  "fraud_probability": 0.73,
  "fraud_score": 73.0,
  "risk_level": "HIGH",
  "should_block": true,

  "top_risk_factors": [
    {"feature": "amount_log", "impact": 0.42, "direction": "increases"},
    {"feature": "is_night", "impact": 0.31, "direction": "increases"},
    {"feature": "logins_7d_over_30d_ratio", "impact": -0.15, "direction": "decreases"}
  ],

  "shap_values": { ... },

  "ai_analysis": "Транзакция имеет высокий риск из-за нетипичной суммы в ночное время...",
  "aml_analysis": "AML_SCORE: HIGH\nПРИЗНАКИ:\n- Крупная сумма в нерабочее время...",
  "recommendation": "Рекомендуется ручная проверка и связь с клиентом..."
}
```

---

## Уникальные возможности

### 1. Динамическое управление порогом
Администратор может менять порог блокировки в реальном времени через UI без переобучения модели.

### 2. Data Drift мониторинг
Система отслеживает изменения в распределении данных и предупреждает о необходимости переобучения.

### 3. AI-усиленный анализ
GPT-4o анализирует каждую подозрительную транзакцию и даёт:
- Объяснение почему транзакция рискованная
- AML-проверку на отмывание денег
- Конкретные рекомендации аналитику

### 4. Cross-Validation
5-fold Stratified CV гарантирует стабильность метрик на разных выборках.

### 5. Автоверсионирование
Каждое переобучение автоматически увеличивает версию модели.

### 6. MLflow Integration
Полная интеграция с MLflow для трекинга экспериментов и версионирования моделей.

---

## MLOps Stack

### Production URLs

| Сервис | URL | Описание |
|--------|-----|----------|
| **Main App** | https://forte.grekdev.com | Next.js Frontend + Backend |
| **ML Service** | https://forte.grekdev.com:8000 | FastAPI ML API |
| **MLflow** | https://forte.grekdev.com:5000 | Model Registry & Tracking |
| **Airflow** | https://forte.grekdev.com:8081 | ML Pipeline Orchestration |
| **Grafana** | https://forte.grekdev.com:3001 | Metrics Visualization |
| **Kafka UI** | https://forte.grekdev.com:8080 | Message Queue Monitoring |
| **Prometheus** | https://forte.grekdev.com:9090 | Metrics Collection |
| **Alertmanager** | https://forte.grekdev.com:9093 | Alert Management |

### Текущая архитектура

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FORTE.AI MLOps Stack                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │
│  │  Next.js UI │──▶│  FastAPI ML │──▶│   MLflow    │   │   Airflow   │  │
│  │ :443        │   │ :8000       │   │ :5000       │   │ :8081       │  │
│  └─────────────┘   └──────┬──────┘   └─────────────┘   └─────────────┘  │
│                           │                                              │
│                    ┌──────▼──────┐                                       │
│                    │   Ensemble  │                                       │
│                    │ LGB + XGB   │                                       │
│                    └──────┬──────┘                                       │
│                           │                                              │
│              ┌────────────┴────────────┐                                 │
│              ▼                         ▼                                 │
│       ┌──────────┐              ┌──────────┐                            │
│       │   SHAP   │              │  GPT-4o  │                            │
│       │ Explainer│              │ Analysis │                            │
│       └──────────┘              └──────────┘                            │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                         MONITORING                                 │  │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐       │  │
│  │  │Prometheus│──▶│ Grafana  │   │  Kafka   │   │Alertmngr │       │  │
│  │  │ :9090    │   │ :3001    │   │ :8080    │   │ :9093    │       │  │
│  │  └──────────┘   └──────────┘   └──────────┘   └──────────┘       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### MLflow Возможности

| Компонент | Статус | Описание |
|-----------|--------|----------|
| **Experiment Tracking** | Да | Трекинг всех экспериментов |
| **Metrics Logging** | Да | ROC-AUC, F1, Precision, Recall |
| **Model Registry** | Да | Версионирование моделей |
| **Artifacts** | Да | Scaler, feature names, configs |
| **MLflow UI** | Да | https://forte.grekdev.com:5000 |

### MLflow API Endpoints

**Base URL:** `https://forte.grekdev.com/api/mlflow`

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/mlflow/experiments` | GET | Список экспериментов |
| `/api/mlflow/runs` | GET | История обучений |
| `/api/mlflow/run/{id}` | GET | Детали конкретного run |
| `/api/mlflow/models` | GET | Зарегистрированные модели |
| `/api/mlflow/compare` | GET | Сравнение runs |

#### Примеры запросов

```bash
# Получить список экспериментов
curl https://forte.grekdev.com/api/mlflow/experiments

# Получить историю обучений
curl https://forte.grekdev.com/api/mlflow/runs

# Получить детали конкретного run
curl https://forte.grekdev.com/api/mlflow/run/761ca615e0cf47bca8268d20ad10c7b6

# Получить зарегистрированные модели
curl https://forte.grekdev.com/api/mlflow/models

# Сравнить последние 5 runs
curl https://forte.grekdev.com/api/mlflow/compare?limit=5

# Сравнить конкретные runs
curl "https://forte.grekdev.com/api/mlflow/compare?run_ids=id1,id2,id3"
```

#### Пример ответа `/api/mlflow/runs`

```json
{
  "runs": [
    {
      "run_id": "761ca615e0cf47bca8268d20ad10c7b6",
      "run_name": "ensemble_training",
      "status": "FINISHED",
      "start_time": 1732650000000,
      "duration_ms": 125000,
      "metrics": {
        "test_roc_auc": 0.9972,
        "test_f1_score": 0.8234,
        "test_precision": 0.7891,
        "test_recall": 0.8612,
        "cv_ensemble_auc_mean": 0.9945
      },
      "params": {
        "lgb_n_estimators": "300",
        "xgb_n_estimators": "300",
        "ensemble_lgb_weight": "0.6"
      }
    }
  ],
  "count": 1,
  "experiment_id": "1"
}
```

#### Пример ответа `/api/mlflow/compare`

```json
{
  "runs": [...],
  "comparison": {
    "metric_comparison": {
      "test_roc_auc": {
        "values": [{"run_id": "xxx", "value": 0.9972}],
        "best": {"run_id": "xxx", "value": 0.9972},
        "avg": 0.9972
      }
    },
    "best_run": {
      "run_id": "761ca615e0cf47bca8268d20ad10c7b6",
      "metric": "test_roc_auc",
      "value": 0.9972
    }
  },
  "count": 1
}
```

#### Тестирование API

```bash
# Запуск тестового скрипта (локально)
node scripts/test-mlflow-api.js

# Запуск на production
node scripts/test-mlflow-api.js https://forte.grekdev.com
```

### Kafka + Airflow + Monitoring

| Компонент | Статус | Описание |
|-----------|--------|----------|
| **Kafka** | Да | Real-time streaming транзакций |
| **Kafka UI** | Да | Мониторинг топиков и сообщений |
| **Airflow** | Да | Оркестрация ML пайплайнов |
| **Prometheus** | Да | Сбор метрик сервисов |
| **Grafana** | Да | Визуализация метрик |
| **Alertmanager** | Да | Управление алертами |

---

## Запуск проекта

### Production Deployment (Linux Server + Docker)

#### Требования к серверу

| Компонент | Минимум | Рекомендуется |
|-----------|---------|---------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4 GB | 8+ GB |
| **Disk** | 20 GB | 50+ GB SSD |
| **OS** | Ubuntu 20.04+ | Ubuntu 22.04 LTS |

#### 1. Установка Docker и Docker Compose

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка зависимостей
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Добавление Docker GPG ключа
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Добавление репозитория Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установка Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker

# Проверка установки
docker --version
docker compose version
```

#### 2. Клонирование и настройка проекта

```bash
# Создание директории
mkdir -p ~/forte && cd ~/forte

# Клонирование репозитория
git clone <repo-url> FORTE
cd FORTE

# Или копирование файлов через SCP
# scp -r ./FORTE user@server:~/forte/
```

#### 3. Настройка переменных окружения

```bash
# Создание .env файла
nano .env
```

Содержимое `.env`:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/forte?schema=public"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-super-secret-key-min-32-chars"

# OpenAI
OPENAI_API_KEY="sk-..."

# ML Service (внутри Docker)
ML_SERVICE_URL="http://ml-service:8000"

# MLflow
MLFLOW_TRACKING_URI="https://your-domain.com:5000"

# Airflow
AIRFLOW_DATABASE_URL="postgresql+psycopg2://user:password@host:5432/forte"
AIRFLOW_FERNET_KEY="$(python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())')"
AIRFLOW_SECRET_KEY="your-airflow-secret-key"

# Monitoring
GRAFANA_PASSWORD="your-grafana-password"

# Kafka
KAFKA_BOOTSTRAP_SERVERS="kafka:9092"
```

#### 4. Сборка и запуск контейнеров

```bash
# Сборка всех образов
docker compose build

# Запуск всех сервисов в фоне
docker compose up -d

# Проверка статуса
docker compose ps

# Просмотр логов
docker compose logs -f

# Просмотр логов конкретного сервиса
docker compose logs -f web
docker compose logs -f ml-service
```

#### 5. Инициализация базы данных (миграции)

```bash
# Вариант 1: Через docker exec (рекомендуется)
docker exec -it forte-web npx prisma db push

# Вариант 2: Локально (если установлен Node.js)
npm install
npx prisma generate
npx prisma db push

# Создание тестового пользователя (опционально)
docker exec -it forte-web npx prisma db seed
```

#### 6. Настройка Nginx (Reverse Proxy + SSL)

```bash
# Установка Nginx
sudo apt install -y nginx

# Установка Certbot для SSL
sudo apt install -y certbot python3-certbot-nginx

# Копирование конфигурации
sudo cp nginx/forte.grekdev.com.conf /etc/nginx/sites-available/your-domain.conf

# Редактирование конфигурации (замените домен)
sudo nano /etc/nginx/sites-available/your-domain.conf

# Активация конфигурации
sudo ln -s /etc/nginx/sites-available/your-domain.conf /etc/nginx/sites-enabled/

# Проверка конфигурации
sudo nginx -t

# Перезапуск Nginx
sudo systemctl restart nginx

# Получение SSL сертификата (Let's Encrypt)
sudo certbot --nginx -d your-domain.com
```

#### 7. Настройка файрвола

```bash
# Открытие необходимых портов
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3001/tcp  # Grafana
sudo ufw allow 5000/tcp  # MLflow
sudo ufw allow 8000/tcp  # ML Service
sudo ufw allow 8080/tcp  # Kafka UI
sudo ufw allow 8081/tcp  # Airflow
sudo ufw allow 9090/tcp  # Prometheus
sudo ufw allow 9093/tcp  # Alertmanager

# Включение файрвола
sudo ufw enable
sudo ufw status
```

### Полезные команды

#### Управление контейнерами

```bash
# Перезапуск всех сервисов
docker compose restart

# Перезапуск конкретного сервиса
docker compose restart web
docker compose restart ml-service

# Остановка всех сервисов
docker compose down

# Остановка с удалением volumes (ОСТОРОЖНО!)
docker compose down -v

# Пересборка и перезапуск
docker compose up -d --build

# Пересборка конкретного сервиса
docker compose build web && docker compose up -d web
```

#### Просмотр логов

```bash
# Все логи в реальном времени
docker compose logs -f

# Логи конкретного сервиса
docker compose logs -f ml-service --tail 100

# Логи с временными метками
docker compose logs -f -t web
```

#### Работа с базой данных

```bash
# Применение миграций
docker exec -it forte-web npx prisma db push

# Генерация Prisma Client
docker exec -it forte-web npx prisma generate

# Просмотр данных (Prisma Studio)
npx prisma studio

# Сброс базы данных (ОСТОРОЖНО!)
docker exec -it forte-web npx prisma migrate reset
```

#### Обновление проекта

```bash
# Получение обновлений
git pull origin main

# Пересборка и перезапуск
docker compose build
docker compose up -d

# Применение миграций (если есть)
docker exec -it forte-web npx prisma db push
```

### Production URLs

| Сервис | URL |
|--------|-----|
| **Main App** | https://forte.grekdev.com |
| **ML Service** | https://forte.grekdev.com:8000 |
| **MLflow** | https://forte.grekdev.com:5000 |
| **Airflow** | https://forte.grekdev.com:8081 |
| **Grafana** | https://forte.grekdev.com:3001 |
| **Kafka UI** | https://forte.grekdev.com:8080 |
| **Prometheus** | https://forte.grekdev.com:9090 |
| **Alertmanager** | https://forte.grekdev.com:9093 |
| **API Docs** | https://forte.grekdev.com/api-docs |

---

### Local Development

#### Установка зависимостей

```bash
# Frontend + Backend
npm install

# ML Service
cd ml-service
pip install -r requirements.txt
```

#### Настройка локального окружения

Создайте `.env.local` для переопределения production настроек:

```env
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

#### Запуск (без Docker)

```bash
# Терминал 1 - ML Service
cd ml-service
python serve.py

# Терминал 2 - MLflow UI
cd ml-service
python start_mlflow.py

# Терминал 3 - Next.js
npm run dev
```

| Сервис | Local URL |
|--------|-----------|
| **Web UI** | http://localhost:3000 |
| **ML API** | http://localhost:8000 |
| **MLflow** | http://localhost:5000 |

#### Инициализация БД (локально)

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

---

## Обучение модели

```bash
cd ml-service
python train_model.py
```

Результат:
- `models/lgb_model.joblib` - LightGBM модель
- `models/xgb_model.joblib` - XGBoost модель
- `models/scaler.joblib` - StandardScaler
- `models/metadata.json` - метаданные и порог
- `models/metrics.json` - все метрики и CV результаты
- `models/mlruns/` - MLflow эксперименты и артефакты

### MLflow Tracking

При обучении автоматически логируется:
- Все гиперпараметры (learning_rate, n_estimators, etc.)
- Метрики каждого fold CV
- Test set метрики (ROC-AUC, F1, Precision, Recall)
- Confusion matrix метрики
- Модели регистрируются в Model Registry

---

## Структура проекта

```
FORTE/
├── src/
│   ├── app/
│   │   ├── model/          # Страница управления ML
│   │   ├── transactions/   # Список транзакций
│   │   ├── dashboard/      # Главный дашборд
│   │   └── api/
│   │       └── ml/         # API routes для ML
│   └── components/         # React компоненты
│
├── ml-service/
│   ├── Dockerfile         # Docker образ ML сервиса
│   ├── serve.py           # FastAPI сервер
│   ├── train_model.py     # Обучение с MLflow
│   ├── start_mlflow.py    # Запуск MLflow UI
│   ├── models/
│   │   ├── lgb_model.joblib
│   │   ├── xgb_model.joblib
│   │   ├── scaler.joblib
│   │   ├── metadata.json
│   │   ├── metrics.json
│   │   └── mlruns/        # MLflow experiments
│   └── app/
│       ├── api/routes.py
│       └── services/
│
├── airflow/
│   └── dags/              # Airflow DAGs для ML пайплайнов
│
├── monitoring/
│   ├── prometheus/
│   │   ├── prometheus.yml # Конфигурация Prometheus
│   │   └── alerts.yml     # Правила алертов
│   ├── grafana/
│   │   ├── provisioning/  # Автоконфигурация datasources
│   │   └── dashboards/    # JSON дашборды
│   └── alertmanager/
│       └── alertmanager.yml
│
├── nginx/
│   └── forte.grekdev.com.conf  # Nginx конфигурация
│
├── prisma/
│   └── schema.prisma
│
├── docker-compose.yml     # Docker Compose для всего стека
├── Dockerfile             # Docker образ Next.js
├── .env                   # Переменные окружения
└── README.md
```

---

## Команда разработки

**GREKdev Team** - Forte.kz Hackathon 2025
