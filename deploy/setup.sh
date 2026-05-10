#!/bin/bash
# Cashflow — первоначальная настройка VPS (Ubuntu 22/24)
# Запуск: bash setup.sh <domain>
# Пример: bash setup.sh cashflow.example.com

set -e

DOMAIN=${1:?"Usage: bash setup.sh <domain>"}
APP_DIR="/opt/cashflow"
DB_NAME="cashflow"
DB_USER="cashflow"
DB_PASS=$(openssl rand -hex 16)

echo "=== Cashflow VPS Setup ==="
echo "Domain: $DOMAIN"
echo ""

# 1. Обновление системы
echo ">>> Обновление системы..."
apt update && apt upgrade -y

# 2. Node.js 20
echo ">>> Установка Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. PostgreSQL
echo ">>> Установка PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Создание БД и пользователя
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

echo ">>> БД создана: $DB_NAME / $DB_USER / $DB_PASS"

# 4. Nginx
echo ">>> Установка Nginx..."
apt install -y nginx
systemctl enable nginx

# 5. Certbot (SSL)
echo ">>> Установка Certbot..."
apt install -y certbot python3-certbot-nginx

# 6. Создание директории приложения
echo ">>> Создание $APP_DIR..."
mkdir -p $APP_DIR
cd $APP_DIR

# 7. Nginx конфиг
echo ">>> Настройка Nginx..."
cat > /etc/nginx/sites-available/cashflow <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/cashflow /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 8. SSL сертификат
echo ">>> Получение SSL-сертификата..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email justvaduxa@gmail.com --redirect

# 9. Systemd сервис для Next.js
echo ">>> Создание systemd-сервиса (next)..."
cat > /etc/systemd/system/cashflow.service <<SERVICE
[Unit]
Description=Cashflow Next.js App
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node $APP_DIR/.next/standalone/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
EnvironmentFile=$APP_DIR/.env.production

[Install]
WantedBy=multi-user.target
SERVICE

# 10. Примечание: бот работает через webhook, polling только локально
echo ">>> Бот настраивается через webhook после деплоя (polling — только для локальной разработки)"

systemctl daemon-reload

# 11. Создание .env.production
echo ">>> Создание .env.production..."
cat > $APP_DIR/.env.production <<ENV
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"
TELEGRAM_BOT_TOKEN=""
TELEGRAM_BOT_SECRET=""
YUKASSA_SHOP_ID=""
YUKASSA_SECRET_KEY=""
NEXTAUTH_SECRET="$(openssl rand -hex 32)"
NEXT_PUBLIC_TG_APP_URL="https://$DOMAIN"
ENV

chmod 600 $APP_DIR/.env.production

# 12. Crontab
echo ">>> Настройка crontab..."
NEXTAUTH_SECRET_VAL=$(grep NEXTAUTH_SECRET $APP_DIR/.env.production | cut -d'"' -f2)
(crontab -l 2>/dev/null; cat <<CRON
# Cashflow cron jobs
*/15 * * * * curl -fsS -H "Authorization: Bearer $NEXTAUTH_SECRET_VAL" https://$DOMAIN/api/cron/notify-upcoming >> /var/log/cashflow-cron.log 2>&1
0 12 * * *  curl -fsS -H "Authorization: Bearer $NEXTAUTH_SECRET_VAL" https://$DOMAIN/api/cron/notify-inactive >> /var/log/cashflow-cron.log 2>&1
*/5  * * * * curl -fsS -H "Authorization: Bearer $NEXTAUTH_SECRET_VAL" https://$DOMAIN/api/cron/cleanup-pending >> /var/log/cashflow-cron.log 2>&1
*/15 * * * * curl -fsS -H "Authorization: Bearer $NEXTAUTH_SECRET_VAL" https://$DOMAIN/api/cron/finish-games >> /var/log/cashflow-cron.log 2>&1
*/5  * * * * curl -fsS -H "Authorization: Bearer $NEXTAUTH_SECRET_VAL" https://$DOMAIN/api/cron/expire-waitlist >> /var/log/cashflow-cron.log 2>&1
0 3 * * *   sudo -u postgres pg_dump cashflow | gzip > /backups/cashflow_$(date +\%Y\%m\%d).sql.gz
0 4 * * 0   find /backups -name "cashflow_*.sql.gz" -mtime +30 -delete
CRON
) | crontab -

# 13. Директория для бэкапов
echo ">>> Создание директории бэкапов..."
mkdir -p /backups
chmod 700 /backups
chown postgres:postgres /backups

echo ""
echo "========================================="
echo "  Настройка завершена!"
echo "========================================="
echo ""
echo "Database: postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
echo "App dir:  $APP_DIR"
echo "Domain:   https://$DOMAIN"
echo ""
echo "Следующие шаги:"
echo "1. Заполни TELEGRAM_BOT_TOKEN в $APP_DIR/.env.production"
echo "2. Загрузи проект: rsync или git clone"
echo "3. Запусти: bash $APP_DIR/deploy/deploy.sh"
echo ""
