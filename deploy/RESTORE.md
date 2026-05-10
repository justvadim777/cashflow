# Восстановление БД

## Список бэкапов

```bash
ls -la /backups/cashflow_*.sql.gz
```

## Восстановление из бэкапа

```bash
gunzip -c /backups/cashflow_YYYYMMDD.sql.gz | sudo -u postgres psql cashflow
```

## Создать бэкап вручную

```bash
sudo -u postgres pg_dump cashflow | gzip > /backups/cashflow_$(date +%Y%m%d_%H%M).sql.gz
```

## Автоматические бэкапы

Crontab настроен в `setup.sh`:
- Каждый день в 03:00 — создание бэкапа
- Каждое воскресенье в 04:00 — удаление бэкапов старше 30 дней
