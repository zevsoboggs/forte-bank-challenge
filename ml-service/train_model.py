"""
Forte.AI ML Model Training Pipeline
Обучает ансамбль моделей для детекции мошеннических транзакций

MLOps: Интеграция с MLflow для трекинга экспериментов и версионирования моделей
"""

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.metrics import (
    roc_auc_score, precision_recall_curve, f1_score, fbeta_score,
    confusion_matrix, classification_report, precision_score, recall_score
)
from sklearn.preprocessing import StandardScaler, LabelEncoder
from imblearn.over_sampling import SMOTE
from imblearn.under_sampling import RandomUnderSampler
from imblearn.pipeline import Pipeline as ImbPipeline
import lightgbm as lgb
import xgboost as xgb
import joblib
import json
from pathlib import Path
from typing import Tuple, Dict, Any
import warnings
warnings.filterwarnings('ignore')

# MLflow для трекинга экспериментов
import mlflow
import mlflow.sklearn
import mlflow.lightgbm
import mlflow.xgboost
from mlflow.models.signature import infer_signature


class FraudDetectionModel:
    """
    Гибридная ML-модель для детекции мошенничества
    Использует ансамбль LightGBM + XGBoost с балансировкой классов
    """

    def __init__(self, model_dir: str = "models", experiment_name: str = "forte-fraud-detection"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)

        self.lgb_model = None
        self.xgb_model = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_names = []
        self.model_version = "1.0.0"

        # MLflow настройка - используем удалённый сервер или локальный
        self.experiment_name = experiment_name
        mlflow_uri = os.getenv("MLFLOW_TRACKING_URI", "https://forte.grekdev.com:5000")
        mlflow.set_tracking_uri(mlflow_uri)
        mlflow.set_experiment(experiment_name)
        print(f"[MLflow] Эксперимент: {experiment_name}")
        print(f"[MLflow] Tracking URI: {mlflow_uri}")

    def load_data(self, behavioral_path: str, transactions_path: str) -> pd.DataFrame:
        """Загрузка и объединение данных"""
        print("[*] Загрузка данных...")

        # Загрузка файлов с автоопределением кодировки
        encodings = ['cp1251', 'windows-1251', 'utf-8', 'latin-1']

        behavioral = None
        for enc in encodings:
            try:
                # Используем header=1 чтобы пропустить длинные русские названия
                behavioral = pd.read_csv(behavioral_path, sep=';', encoding=enc, header=1)
                print(f"[OK] Поведенческие данные загружены (кодировка: {enc})")
                break
            except (UnicodeDecodeError, UnicodeError):
                continue

        if behavioral is None:
            raise ValueError("Не удалось загрузить поведенческие данные с поддерживаемой кодировкой")

        transactions = None
        for enc in encodings:
            try:
                # Используем header=1 чтобы пропустить длинные русские названия
                transactions = pd.read_csv(transactions_path, sep=';', encoding=enc, header=1)
                print(f"[OK] Транзакции загружены (кодировка: {enc})")
                break
            except (UnicodeDecodeError, UnicodeError):
                continue

        if transactions is None:
            raise ValueError("Не удалось загрузить транзакции с поддерживаемой кодировкой")

        print(f"Поведенческие данные: {behavioral.shape}")
        print(f"Транзакции: {transactions.shape}")

        # Объединение данных по ключу cst_dim_id
        df = transactions.merge(
            behavioral,
            on='cst_dim_id',
            how='left',
            suffixes=('', '_behavior')
        )

        print(f"Объединенный датасет: {df.shape}")
        print(f"\nРаспределение классов:")
        print(df['target'].value_counts())
        print(f"Fraud rate: {df['target'].mean():.2%}")

        return df

    def feature_engineering(self, df: pd.DataFrame) -> pd.DataFrame:
        """Инжиниринг признаков"""
        print("\n[PROCESS] Инжиниринг признаков...")

        df = df.copy()

        # Очистка кавычек в датах
        for col in ['transdate', 'transdatetime', 'transdate_behavior']:
            if col in df.columns:
                df[col] = df[col].astype(str).str.replace("'", "")

        # Преобразование дат
        df['transdate'] = pd.to_datetime(df['transdate'], errors='coerce')
        df['transdatetime'] = pd.to_datetime(df['transdatetime'], errors='coerce')

        # Временные признаки
        df['hour'] = df['transdatetime'].dt.hour
        df['day_of_week'] = df['transdatetime'].dt.dayofweek
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        df['is_night'] = df['hour'].between(0, 6).astype(int)
        df['is_business_hours'] = df['hour'].between(9, 18).astype(int)

        # Логарифм суммы
        df['amount_log'] = np.log1p(df['amount'])

        # Бины для суммы
        df['amount_bin'] = pd.qcut(df['amount'], q=10, labels=False, duplicates='drop')

        # Кодирование категориальных признаков
        categorical_cols = ['last_phone_model_categorical', 'last_os_categorical', 'direction']

        for col in categorical_cols:
            if col in df.columns:
                le = LabelEncoder()
                # Заполняем пропуски и кодируем
                df[col] = df[col].fillna('Unknown')
                df[f'{col}_encoded'] = le.fit_transform(df[col])
                self.label_encoders[col] = le

        # Заполнение пропусков в числовых колонках
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if df[col].isnull().any():
                df[col] = df[col].fillna(df[col].median())

        print(f"[OK] Создано признаков: {df.shape[1]}")

        return df

    def prepare_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """Подготовка признаков для обучения"""

        # Целевая переменная
        y = df['target']

        # Исключаем ненужные колонки (все даты и ID)
        drop_cols = [
            'cst_dim_id', 'transdate', 'transdatetime', 'transdate_behavior',
            'docno', 'direction', 'target',
            'last_phone_model_categorical', 'last_os_categorical'  # Уже закодированы
        ]

        X = df.drop(columns=[col for col in drop_cols if col in df.columns])

        # Проверяем строковые колонки
        object_cols = X.select_dtypes(include=['object']).columns.tolist()
        if object_cols:
            print(f"\n[WARN] Найдены строковые колонки: {object_cols}")
            for col in object_cols:
                print(f"   {col}: примеры значений = {X[col].head(3).tolist()}")
            print("Попытка преобразования в числовой формат...")

            # Пытаемся преобразовать каждую строковую колонку
            for col in object_cols:
                X[col] = pd.to_numeric(X[col], errors='coerce')

            # Удаляем колонки, где все значения стали NaN
            for col in object_cols:
                if X[col].isna().all():
                    print(f"   [ERROR] Удаляем {col} (невозможно преобразовать)")
                    X = X.drop(columns=[col])

        # Заполняем NaN медианой
        X = X.fillna(X.median())

        # Сохраняем имена признаков
        self.feature_names = list(X.columns)

        print(f"\n[INFO] Признаки для обучения: {len(self.feature_names)}")
        print(f"Примеры признаков: {self.feature_names[:5]}")

        return X, y

    def train(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
        """Обучение моделей с cross-validation и MLflow трекингом"""
        print("\n[TRAIN] Обучение моделей...")

        # Начинаем MLflow run
        with mlflow.start_run(run_name=f"ensemble_training") as run:
            self.mlflow_run_id = run.info.run_id
            print(f"[MLflow] Run ID: {run.info.run_id}")

            # Логируем параметры модели
            params = {
                "lgb_n_estimators": 300,
                "lgb_max_depth": 7,
                "lgb_learning_rate": 0.05,
                "lgb_num_leaves": 31,
                "xgb_n_estimators": 300,
                "xgb_max_depth": 7,
                "xgb_learning_rate": 0.05,
                "ensemble_lgb_weight": 0.6,
                "ensemble_xgb_weight": 0.4,
                "cv_folds": 5,
                "smote_k_neighbors": 5,
                "test_size": 0.2,
                "random_state": 42
            }
            mlflow.log_params(params)

            # Логируем информацию о данных
            mlflow.log_param("n_features", X.shape[1])
            mlflow.log_param("n_samples", X.shape[0])
            mlflow.log_param("fraud_rate", float(y.mean()))

            # Тегируем run
            mlflow.set_tag("model_type", "LightGBM + XGBoost Ensemble")
            mlflow.set_tag("team", "GREKdev")
            mlflow.set_tag("project", "Forte.AI Antifraud")

            # ==================== TRAIN/TEST SPLIT ====================
            print("\n[SPLIT] Разделение данных на train/test (80/20)...")
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            print(f"Train size: {X_train.shape[0]}, Test size: {X_test.shape[0]}")

            # ==================== CROSS-VALIDATION ====================
            print("\n[CV] Запуск 5-fold Stratified Cross-Validation...")
            cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

            cv_scores = {
                'lgb_auc': [],
                'xgb_auc': [],
                'ensemble_auc': []
            }

            for fold, (train_idx, val_idx) in enumerate(cv.split(X_train, y_train)):
                X_fold_train, X_fold_val = X_train.iloc[train_idx], X_train.iloc[val_idx]
                y_fold_train, y_fold_val = y_train.iloc[train_idx], y_train.iloc[val_idx]

                # Balance
                smote = SMOTE(random_state=42, k_neighbors=5)
                rus = RandomUnderSampler(random_state=42)
                X_bal, y_bal = smote.fit_resample(X_fold_train, y_fold_train)
                X_bal, y_bal = rus.fit_resample(X_bal, y_bal)

                # Scale
                fold_scaler = StandardScaler()
                X_bal_scaled = fold_scaler.fit_transform(X_bal)
                X_val_scaled = fold_scaler.transform(X_fold_val)

                # Train LGB
                lgb_fold = lgb.LGBMClassifier(
                    n_estimators=300, max_depth=7, learning_rate=0.05,
                    num_leaves=31, min_child_samples=20, subsample=0.8,
                    colsample_bytree=0.8, random_state=42, verbose=-1
                )
                lgb_fold.fit(X_bal_scaled, y_bal)

                # Train XGB
                xgb_fold = xgb.XGBClassifier(
                    n_estimators=300, max_depth=7, learning_rate=0.05,
                    subsample=0.8, colsample_bytree=0.8, random_state=42,
                    eval_metric='logloss', verbosity=0
                )
                xgb_fold.fit(X_bal_scaled, y_bal)

                # Evaluate
                lgb_proba = lgb_fold.predict_proba(X_val_scaled)[:, 1]
                xgb_proba = xgb_fold.predict_proba(X_val_scaled)[:, 1]
                ens_proba = 0.6 * lgb_proba + 0.4 * xgb_proba

                cv_scores['lgb_auc'].append(roc_auc_score(y_fold_val, lgb_proba))
                cv_scores['xgb_auc'].append(roc_auc_score(y_fold_val, xgb_proba))
                cv_scores['ensemble_auc'].append(roc_auc_score(y_fold_val, ens_proba))

                # Логируем метрики каждого fold в MLflow
                mlflow.log_metric(f"cv_lgb_auc_fold_{fold+1}", cv_scores['lgb_auc'][-1])
                mlflow.log_metric(f"cv_xgb_auc_fold_{fold+1}", cv_scores['xgb_auc'][-1])
                mlflow.log_metric(f"cv_ensemble_auc_fold_{fold+1}", cv_scores['ensemble_auc'][-1])

                print(f"   Fold {fold+1}: LGB={cv_scores['lgb_auc'][-1]:.4f}, XGB={cv_scores['xgb_auc'][-1]:.4f}, Ensemble={cv_scores['ensemble_auc'][-1]:.4f}")

            # Логируем средние CV метрики
            mlflow.log_metric("cv_lgb_auc_mean", np.mean(cv_scores['lgb_auc']))
            mlflow.log_metric("cv_lgb_auc_std", np.std(cv_scores['lgb_auc']))
            mlflow.log_metric("cv_xgb_auc_mean", np.mean(cv_scores['xgb_auc']))
            mlflow.log_metric("cv_xgb_auc_std", np.std(cv_scores['xgb_auc']))
            mlflow.log_metric("cv_ensemble_auc_mean", np.mean(cv_scores['ensemble_auc']))
            mlflow.log_metric("cv_ensemble_auc_std", np.std(cv_scores['ensemble_auc']))

            print(f"\n[CV RESULTS]")
            print(f"   LightGBM AUC:  {np.mean(cv_scores['lgb_auc']):.4f} (+/- {np.std(cv_scores['lgb_auc']):.4f})")
            print(f"   XGBoost AUC:   {np.mean(cv_scores['xgb_auc']):.4f} (+/- {np.std(cv_scores['xgb_auc']):.4f})")
            print(f"   Ensemble AUC:  {np.mean(cv_scores['ensemble_auc']):.4f} (+/- {np.std(cv_scores['ensemble_auc']):.4f})")

            # ==================== FINAL TRAINING ====================
            print("\n[FINAL] Обучение финальных моделей на всём train set...")

            # Балансировка классов
            smote = SMOTE(random_state=42, k_neighbors=5)
            rus = RandomUnderSampler(random_state=42)
            X_balanced, y_balanced = smote.fit_resample(X_train, y_train)
            X_balanced, y_balanced = rus.fit_resample(X_balanced, y_balanced)

            print(f"Размер после балансировки: {X_balanced.shape}")
            print(f"Fraud rate после балансировки: {y_balanced.mean():.2%}")

            # Нормализация
            X_scaled = self.scaler.fit_transform(X_balanced)

            # LightGBM
            print("\n[LGBM] Обучение LightGBM...")
            self.lgb_model = lgb.LGBMClassifier(
                n_estimators=300,
                max_depth=7,
                learning_rate=0.05,
                num_leaves=31,
                min_child_samples=20,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                verbose=-1
            )
            self.lgb_model.fit(X_scaled, y_balanced)
            print("[OK] LightGBM обучена")

            # XGBoost
            print("\n[XGB] Обучение XGBoost...")
            self.xgb_model = xgb.XGBClassifier(
                n_estimators=300,
                max_depth=7,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                eval_metric='logloss',
                verbosity=0
            )
            self.xgb_model.fit(X_scaled, y_balanced)
            print("[OK] XGBoost обучена")

            # ==================== TEST SET EVALUATION ====================
            print("\n[TEST] Оценка на hold-out test set...")
            X_test_scaled = self.scaler.transform(X_test)

            lgb_proba = self.lgb_model.predict_proba(X_test_scaled)[:, 1]
            xgb_proba = self.xgb_model.predict_proba(X_test_scaled)[:, 1]

            # Ансамбль (взвешенное среднее)
            ensemble_proba = 0.6 * lgb_proba + 0.4 * xgb_proba

            # ROC-AUC
            roc_auc = roc_auc_score(y_test, ensemble_proba)
            print(f"[METRIC] ROC-AUC (test): {roc_auc:.4f}")

            # Оптимальный порог по F1
            precision_curve, recall_curve, thresholds = precision_recall_curve(y_test, ensemble_proba)
            f1_scores = 2 * (precision_curve * recall_curve) / (precision_curve + recall_curve + 1e-10)
            optimal_idx = np.argmax(f1_scores)
            optimal_threshold = thresholds[optimal_idx]
            best_f1 = f1_scores[optimal_idx]

            print(f"[OK] Оптимальный порог: {optimal_threshold:.4f}")
            print(f"[OK] F1-Score: {best_f1:.4f}")

            # Полные метрики на test set
            ensemble_pred = (ensemble_proba >= optimal_threshold).astype(int)

            precision = precision_score(y_test, ensemble_pred)
            recall = recall_score(y_test, ensemble_pred)
            f1 = f1_score(y_test, ensemble_pred)
            f2 = fbeta_score(y_test, ensemble_pred, beta=2)  # F2 - recall важнее
            f05 = fbeta_score(y_test, ensemble_pred, beta=0.5)  # F0.5 - precision важнее

            # Логируем test метрики в MLflow
            mlflow.log_metric("test_roc_auc", roc_auc)
            mlflow.log_metric("test_precision", precision)
            mlflow.log_metric("test_recall", recall)
            mlflow.log_metric("test_f1_score", f1)
            mlflow.log_metric("test_f2_score", f2)
            mlflow.log_metric("test_f05_score", f05)
            mlflow.log_metric("optimal_threshold", optimal_threshold)

            print(f"\n[METRICS] Test Set Performance:")
            print(f"   Precision: {precision:.4f}")
            print(f"   Recall:    {recall:.4f}")
            print(f"   F1-Score:  {f1:.4f}")
            print(f"   F2-Score:  {f2:.4f} (recall-focused)")
            print(f"   F0.5-Score: {f05:.4f} (precision-focused)")

            # Confusion Matrix
            cm = confusion_matrix(y_test, ensemble_pred)
            tn, fp, fn, tp = cm.ravel()

            # Логируем confusion matrix метрики
            mlflow.log_metric("confusion_tn", tn)
            mlflow.log_metric("confusion_fp", fp)
            mlflow.log_metric("confusion_fn", fn)
            mlflow.log_metric("confusion_tp", tp)
            mlflow.log_metric("false_positive_rate", fp/(fp+tn))
            mlflow.log_metric("false_negative_rate", fn/(fn+tp))

            print(f"\n[MATRIX] Confusion Matrix (Test Set):")
            print(f"   TN={tn}, FP={fp}")
            print(f"   FN={fn}, TP={tp}")
            print(f"   False Positive Rate: {fp/(fp+tn):.4f}")
            print(f"   False Negative Rate: {fn/(fn+tp):.4f}")

            # ==================== LOG MODELS TO MLFLOW ====================
            print("\n[MLflow] Логирование моделей...")

            # Создаём signature для моделей
            signature = infer_signature(X_test_scaled, ensemble_proba)

            # Логируем LightGBM модель
            mlflow.lightgbm.log_model(
                self.lgb_model,
                "lightgbm_model",
                signature=signature,
                registered_model_name="forte-fraud-lgb"
            )

            # Логируем XGBoost модель
            mlflow.xgboost.log_model(
                self.xgb_model,
                "xgboost_model",
                signature=signature,
                registered_model_name="forte-fraud-xgb"
            )

            # Логируем scaler как артефакт
            scaler_path = self.model_dir / 'scaler.joblib'
            joblib.dump(self.scaler, scaler_path)
            mlflow.log_artifact(str(scaler_path))

            # Логируем feature names
            feature_names_path = self.model_dir / 'feature_names.json'
            with open(feature_names_path, 'w') as f:
                json.dump(self.feature_names, f)
            mlflow.log_artifact(str(feature_names_path))

            print(f"[MLflow] Модели залогированы в run: {run.info.run_id}")

            # ==================== SAVE MODEL & METRICS ====================
            metrics = {
                'cv_scores': {
                    'lgb_auc_mean': float(np.mean(cv_scores['lgb_auc'])),
                    'lgb_auc_std': float(np.std(cv_scores['lgb_auc'])),
                    'xgb_auc_mean': float(np.mean(cv_scores['xgb_auc'])),
                    'xgb_auc_std': float(np.std(cv_scores['xgb_auc'])),
                    'ensemble_auc_mean': float(np.mean(cv_scores['ensemble_auc'])),
                    'ensemble_auc_std': float(np.std(cv_scores['ensemble_auc']))
                },
                'test_scores': {
                    'roc_auc': float(roc_auc),
                    'precision': float(precision),
                    'recall': float(recall),
                    'f1_score': float(f1),
                    'f2_score': float(f2),
                    'f05_score': float(f05),
                    'optimal_threshold': float(optimal_threshold)
                },
                'confusion_matrix': {
                    'true_negatives': int(tn),
                    'false_positives': int(fp),
                    'false_negatives': int(fn),
                    'true_positives': int(tp)
                },
                'data_info': {
                    'train_size': int(X_train.shape[0]),
                    'test_size': int(X_test.shape[0]),
                    'fraud_rate_train': float(y_train.mean()),
                    'fraud_rate_test': float(y_test.mean())
                },
                'mlflow': {
                    'run_id': run.info.run_id,
                    'experiment_name': self.experiment_name
                }
            }

            self.save_model(optimal_threshold, metrics)

            # Логируем metrics.json как артефакт
            mlflow.log_artifact(str(self.model_dir / 'metrics.json'))

            return {
                'roc_auc': roc_auc,
                'f1_score': f1,
                'precision': precision,
                'recall': recall,
                'optimal_threshold': optimal_threshold,
                'cv_auc_mean': np.mean(cv_scores['ensemble_auc']),
                'cv_auc_std': np.std(cv_scores['ensemble_auc']),
                'mlflow_run_id': run.info.run_id
            }

    def save_model(self, optimal_threshold: float, metrics: Dict[str, Any] = None):
        """Сохранение обученной модели и метрик"""
        print("\n[SAVE] Сохранение моделей...")

        joblib.dump(self.lgb_model, self.model_dir / 'lgb_model.joblib')
        joblib.dump(self.xgb_model, self.model_dir / 'xgb_model.joblib')
        joblib.dump(self.scaler, self.model_dir / 'scaler.joblib')
        joblib.dump(self.label_encoders, self.model_dir / 'label_encoders.joblib')

        # Увеличиваем версию модели
        try:
            with open(self.model_dir / 'metadata.json', 'r') as f:
                old_meta = json.load(f)
                old_version = old_meta.get('version', '1.0.0')
                # Increment patch version
                parts = old_version.split('.')
                parts[-1] = str(int(parts[-1]) + 1)
                self.model_version = '.'.join(parts)
        except:
            self.model_version = '1.0.0'

        # Метаданные
        metadata = {
            'version': self.model_version,
            'feature_names': self.feature_names,
            'optimal_threshold': optimal_threshold,
            'model_type': 'LightGBM + XGBoost Ensemble',
            'created_at': pd.Timestamp.now().isoformat()
        }

        with open(self.model_dir / 'metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)

        # Сохраняем детальные метрики отдельно
        if metrics:
            metrics['saved_at'] = pd.Timestamp.now().isoformat()
            metrics['model_version'] = self.model_version
            with open(self.model_dir / 'metrics.json', 'w') as f:
                json.dump(metrics, f, indent=2)
            print("[OK] Метрики сохранены в metrics.json")

        print(f"[OK] Модели сохранены успешно! Версия: {self.model_version}")


def main():
    """Основная функция обучения"""
    print("=" * 60)
    print("Forte.AI - GREKdev Model Training")
    print("=" * 60)

    # Пути к данным - поддержка Docker и локального запуска
    # Docker: /app/data/, Local: ml-service/data/ или корень проекта
    import os

    # Проверяем разные локации данных
    data_locations = [
        # Docker paths
        ("/app/data/behavioral_patterns.csv", "/app/data/transactions.csv"),
        ("data/behavioral_patterns.csv", "data/transactions.csv"),
        # Local paths (relative to ml-service folder)
        ("../поведенческие паттерны клиентов.csv", "../транзакции в Мобильном интернет Банкинге.csv"),
    ]

    behavioral_path = None
    transactions_path = None

    for bp, tp in data_locations:
        if os.path.exists(bp) and os.path.exists(tp):
            behavioral_path = bp
            transactions_path = tp
            print(f"[OK] Found data files at: {bp}")
            break

    if not behavioral_path:
        raise FileNotFoundError(
            "Training data not found! Checked locations:\n" +
            "\n".join([f"  - {loc[0]}" for loc in data_locations])
        )

    # Инициализация модели
    model = FraudDetectionModel()

    # Загрузка данных
    df = model.load_data(behavioral_path, transactions_path)

    # Инжиниринг признаков
    df = model.feature_engineering(df)

    # Подготовка признаков
    X, y = model.prepare_features(df)

    # Обучение
    metrics = model.train(X, y)

    print("\n" + "=" * 60)
    print("[SUCCESS] Обучение завершено успешно!")
    print("=" * 60)

    return metrics


if __name__ == "__main__":
    main()
