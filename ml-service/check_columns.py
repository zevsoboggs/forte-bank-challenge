import pandas as pd
import json

# Behavioral
b = pd.read_csv('../поведенческие паттерны клиентов.csv', sep=';', encoding='cp1251', nrows=1)
behavioral_cols = list(b.columns)

# Transactions
t = pd.read_csv('../транзакции в Мобильном интернет Банкинге.csv', sep=';', encoding='cp1251', nrows=1)
transaction_cols = list(t.columns)

# Save to JSON
with open('columns.json', 'w', encoding='utf-8') as f:
    json.dump({
        'behavioral': behavioral_cols,
        'transactions': transaction_cols
    }, f, ensure_ascii=False, indent=2)

print("Колонки сохранены в columns.json")
