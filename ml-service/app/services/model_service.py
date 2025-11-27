import joblib
import numpy as np
import pandas as pd
import shap
import json
import asyncio
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from app.core.config import settings
from app.core.logging import logger
from app.schemas.transaction import TransactionFeatures

class ModelService:
    def __init__(self):
        self.lgb_model = None
        self.xgb_model = None
        self.scaler = None
        self.label_encoders = None
        self.metadata = None
        self.explainer = None
        self.executor = ThreadPoolExecutor(max_workers=4)

    def load_models(self):
        """Load models from disk"""
        logger.info("Loading models...")
        try:
            model_dir = settings.MODEL_DIR
            self.lgb_model = joblib.load(model_dir / 'lgb_model.joblib')
            self.xgb_model = joblib.load(model_dir / 'xgb_model.joblib')
            self.scaler = joblib.load(model_dir / 'scaler.joblib')
            self.label_encoders = joblib.load(model_dir / 'label_encoders.joblib')

            with open(model_dir / 'metadata.json', 'r') as f:
                self.metadata = json.load(f)

            logger.info("Initializing SHAP explainer...")
            self.explainer = shap.TreeExplainer(self.lgb_model)
            
            logger.info(f"Models loaded successfully. Version: {self.metadata['version']}")
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            raise

    def _prepare_features(self, transaction: TransactionFeatures) -> tuple[np.ndarray, pd.DataFrame]:
        """Prepare features for prediction (CPU bound)"""
        data = transaction.model_dump()

        # Feature Engineering
        data['amount_log'] = np.log1p(data['amount'])
        data['is_weekend'] = int(data['day_of_week'] in [5, 6])
        data['is_night'] = int(data['hour'] >= 22 or data['hour'] <= 6)
        data['is_business_hours'] = int(9 <= data['hour'] <= 18)

        # Categorical Encoding
        if 'last_phone_model' in data and data['last_phone_model']:
            if 'last_phone_model_categorical' in self.label_encoders:
                le = self.label_encoders['last_phone_model_categorical']
                try:
                    data['last_phone_model_categorical_encoded'] = le.transform([data['last_phone_model']])[0]
                except:
                    data['last_phone_model_categorical_encoded'] = -1
            del data['last_phone_model']

        if 'last_os' in data and data['last_os']:
            if 'last_os_categorical' in self.label_encoders:
                le = self.label_encoders['last_os_categorical']
                try:
                    data['last_os_categorical_encoded'] = le.transform([data['last_os']])[0]
                except:
                    data['last_os_categorical_encoded'] = -1
            del data['last_os']

        if 'direction' in data and data['direction']:
            if 'direction' in self.label_encoders:
                le = self.label_encoders['direction']
                try:
                    data['direction_encoded'] = le.transform([data['direction']])[0]
                except:
                    data['direction_encoded'] = -1
            del data['direction']

        # Create DataFrame
        df = pd.DataFrame([data])

        # Add missing features
        for feat in self.metadata['feature_names']:
            if feat not in df.columns:
                df[feat] = -999

        # Sort columns
        df = df[self.metadata['feature_names']]

        # Fill NaN
        df = df.fillna(-999)

        # Scale
        X_scaled = self.scaler.transform(df)

        return X_scaled, df

    def _predict_sync(self, transaction: TransactionFeatures) -> dict:
        """Synchronous prediction logic"""
        X_scaled, _ = self._prepare_features(transaction)

        lgb_proba = self.lgb_model.predict_proba(X_scaled)[0, 1]
        xgb_proba = self.xgb_model.predict_proba(X_scaled)[0, 1]

        fraud_probability = float(0.6 * lgb_proba + 0.4 * xgb_proba)
        
        # SHAP
        shap_values = self.explainer.shap_values(X_scaled)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]
        
        shap_dict = dict(zip(self.metadata['feature_names'], shap_values[0]))
        
        return {
            "fraud_probability": fraud_probability,
            "shap_values": shap_dict
        }

    async def predict(self, transaction: TransactionFeatures) -> dict:
        """Async wrapper for prediction"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, self._predict_sync, transaction)

model_service = ModelService()
