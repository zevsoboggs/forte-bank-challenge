import pandas as pd
import numpy as np
from train_model import FraudDetectionModel

# Инициализация
model = FraudDetectionModel()

# Загрузка данных
behavioral_path = "../поведенческие паттерны клиентов.csv"
transactions_path = "../транзакции в Мобильном интернет Банкинге.csv"

df = model.load_data(behavioral_path, transactions_path)
df = model.feature_engineering(df)

# Подготовка признаков
X, y = model.prepare_features(df)

print("\n=== ТИПЫ ДАННЫХ ===")
print(X.dtypes)

print("\n=== КОЛОНКИ С ТИПОМ object (строки) ===")
object_cols = X.select_dtypes(include=['object']).columns
print(f"Найдено {len(object_cols)} строковых колонок:")
for col in object_cols:
    print(f"  - {col}")
    print(f"    Примеры значений: {X[col].head(3).tolist()}")
