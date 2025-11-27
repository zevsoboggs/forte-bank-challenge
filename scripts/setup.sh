#!/bin/bash

# Forte.AI Setup Script
# Автоматическая настройка проекта

echo "======================================"
echo "   Forte.AI - Setup Script"
echo "======================================"
echo ""

# 1. Проверка зависимостей
echo "📋 Проверка зависимостей..."

command -v node >/dev/null 2>&1 || { echo "❌ Node.js не установлен. Установите Node.js >= 18"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker не установлен. Установите Docker"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose не установлен"; exit 1; }

echo "✅ Все зависимости установлены"
echo ""

# 2. Создание .env файла
echo "🔧 Настройка переменных окружения..."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Создан файл .env"
  echo "⚠️  ВАЖНО: Отредактируйте .env и добавьте ваш OPENAI_API_KEY"
else
  echo "ℹ️  Файл .env уже существует"
fi

# Генерация NEXTAUTH_SECRET
if grep -q "your-secret-key-here" .env; then
  SECRET=$(openssl rand -base64 32)
  sed -i "s/your-secret-key-here-generate-with-openssl-rand-base64-32/$SECRET/" .env
  echo "✅ NEXTAUTH_SECRET сгенерирован"
fi

echo ""

# 3. Запуск Docker Compose
echo "🐳 Запуск Docker контейнеров..."
docker-compose up -d

echo "⏳ Ждем запуска PostgreSQL..."
sleep 10

# 4. Миграции БД
echo "📦 Применение миграций БД..."
docker-compose exec -T web npx prisma migrate deploy

# 5. Seed данных
echo "🌱 Создание демо-пользователей..."
docker-compose exec -T web npx prisma db seed

echo ""
echo "======================================"
echo "✅ Forte.AI успешно настроен!"
echo "======================================"
echo ""
echo "Следующие шаги:"
echo "1. Скопируйте CSV файлы с данными"
echo "2. Обучите ML-модель:"
echo "   docker-compose exec ml-service python train_model.py"
echo "3. Откройте браузер: http://localhost:3000"
echo "4. Войдите с: analyst@forte.kz / demo123"
echo ""
