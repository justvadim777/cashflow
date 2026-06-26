#!/bin/bash
# Cashflow — деплой обновлений
# Запуск на сервере: bash /opt/cashflow/deploy/deploy.sh

set -e

APP_DIR="/opt/cashflow"
cd $APP_DIR

echo "=== Cashflow Deploy ==="

# 1. Установка зависимостей
echo ">>> npm install..."
npm ci --production=false

# 2. Генерация Prisma клиента
echo ">>> Prisma generate..."
npx prisma generate

# 3. Миграции БД
echo ">>> Prisma migrate..."
npx prisma migrate deploy

# 4. Сборка (без doppler, env берём из .env.production)
echo ">>> Next.js build..."
set -a; source $APP_DIR/.env.production; set +a; npm run build:ci

# 5. Перезапуск сервисов
echo ">>> Перезапуск сервисов..."
systemctl restart cashflow
systemctl enable cashflow

# 6. Регистрация webhook бота
echo ">>> Установка Telegram webhook..."
DOMAIN=$(grep NEXT_PUBLIC_TG_APP_URL $APP_DIR/.env.production | cut -d'"' -f2)
npx tsx $APP_DIR/scripts/set-webhook.ts $DOMAIN --env-file=$APP_DIR/.env.production 2>&1 || true

echo ""
echo ">>> Проверка статуса..."
systemctl status cashflow --no-pager -l | head -5

echo ""
echo "=== Deploy завершён ==="
echo "Приложение: https://$(grep NEXT_PUBLIC_TG_APP_URL $APP_DIR/.env.production | cut -d'"' -f2 | sed 's|https://||')"
