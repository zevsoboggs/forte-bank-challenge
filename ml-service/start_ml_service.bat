@echo off
echo ============================================================
echo Forte.AI ML Service - Starting...
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Python dependencies...
python -m pip install --quiet -r requirements.txt

echo.
echo [2/3] Verifying installation...
python -c "import shap, lightgbm, xgboost, openai; print('[OK] All packages installed')"

echo.
echo [3/3] Starting ML Service on http://localhost:8000
echo Press Ctrl+C to stop
echo.

python serve.py

pause
