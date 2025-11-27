"""
Forte.AI - MLflow UI Launcher
Запускает MLflow UI для просмотра экспериментов и моделей
"""

import subprocess
import sys
import os
from pathlib import Path

# Определяем путь к mlruns
MLRUNS_PATH = Path(__file__).parent / "models" / "mlruns"

def main():
    print("=" * 60)
    print("Forte.AI - MLflow UI")
    print("=" * 60)

    # Создаём директорию если не существует
    MLRUNS_PATH.mkdir(parents=True, exist_ok=True)

    print(f"\n[INFO] MLruns path: {MLRUNS_PATH.absolute()}")
    print(f"[INFO] Starting MLflow UI on http://localhost:5000")
    print(f"\n[TIP] Откройте http://localhost:5000 в браузере")
    print(f"[TIP] Для остановки нажмите Ctrl+C\n")

    try:
        # Запускаем MLflow UI
        subprocess.run([
            sys.executable, "-m", "mlflow", "ui",
            "--backend-store-uri", f"file://{MLRUNS_PATH.absolute()}",
            "--host", "0.0.0.0",
            "--port", "5000"
        ], check=True)
    except KeyboardInterrupt:
        print("\n[INFO] MLflow UI остановлен")
    except subprocess.CalledProcessError as e:
        print(f"\n[ERROR] Ошибка запуска MLflow: {e}")
        print("[TIP] Убедитесь что mlflow установлен: pip install mlflow")
        sys.exit(1)

if __name__ == "__main__":
    main()
