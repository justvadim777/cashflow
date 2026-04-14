#!/bin/bash
# Загрузка проекта на сервер
# Запуск с локальной машины: bash deploy/upload.sh

SERVER="root@72.56.250.40"
APP_DIR="/opt/cashflow"

echo ">>> Загрузка файлов на $SERVER:$APP_DIR..."

rsync -avz --progress \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .env \
  --exclude "src/generated" \
  ./ "$SERVER:$APP_DIR/"

echo ">>> Загрузка завершена"
echo ">>> Подключись: ssh $SERVER"
echo ">>> И запусти:  bash $APP_DIR/deploy/deploy.sh"
