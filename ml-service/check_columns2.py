import pandas as pd
import json

# Behavioral с header=1
b = pd.read_csv('../поведенческие паттерны клиентов.csv', sep=';', encoding='cp1251', header=1)
print("Behavioral columns:", list(b.columns))
print("Behavioral shape:", b.shape)
print("\nFirst row:")
print(b.head(1))

print("\n" + "="*60 + "\n")

# Transactions с header=1
t = pd.read_csv('../транзакции в Мобильном интернет Банкинге.csv', sep=';', encoding='cp1251', header=1)
print("Transaction columns:", list(t.columns))
print("Transaction shape:", t.shape)
print("\nFirst row:")
print(t.head(1))
print("\nTarget value counts:")
print(t['target'].value_counts())
