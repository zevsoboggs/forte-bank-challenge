@echo off
REM Forte.AI Setup Script for Windows
REM Автоматическая настройка проекта

echo ======================================
echo    Forte.AI - Setup Script
echo ======================================
echo.

REM 1. Проверка зависимостей
echo Проверка зависимостей...

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Ошибка: Node.js не установлен. Установите Node.js ^>= 18
    exit /b 1
)

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Ошибка: Docker не установлен. Установите Docker Desktop
    exit /b 1
)

echo Все зависимости установлены
echo.

REM 2. Создание .env файла
echo Настройка переменных окружения...

if not exist .env (
    copy .env.example .env
    echo Создан файл .env
    echo ВАЖНО: Отредактируйте .env и добавьте ваш OPENAI_API_KEY
) else (
    echo Файл .env уже существует
)

echo.

REM 3. Запуск Docker Compose
echo Запуск Docker контейнеров...
docker-compose up -d

echo Ждем запуска PostgreSQL...
timeout /t 10 /nobreak >nul

REM 4. Миграции БД
echo Применение миграций БД...
docker-compose exec -T web npx prisma migrate deploy

REM 5. Seed данных
echo Создание демо-пользователей...
docker-compose exec -T web npx prisma db seed

echo.
echo ======================================
echo Forte.AI успешно настроен!
echo ======================================
echo.
echo Следующие шаги:
echo 1. Скопируйте CSV файлы с данными
echo 2. Обучите ML-модель:
echo    docker-compose exec ml-service python train_model.py
echo 3. Откройте браузер: http://localhost:3000
echo 4. Войдите с: analyst@forte.kz / demo123
echo.

pause
