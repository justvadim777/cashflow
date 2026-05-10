-- Create missing tables: notification_logs, game_waitlists, refund_requests, audit_logs
CREATE TABLE IF NOT EXISTS "notification_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "game_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_logs_user_id_game_id_type_key" UNIQUE ("user_id", "game_id", "type")
);

CREATE TABLE IF NOT EXISTS "game_waitlists" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "game_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notified_at" TIMESTAMP(3),
  CONSTRAINT "game_waitlists_game_id_user_id_key" UNIQUE ("game_id", "user_id"),
  FOREIGN KEY ("game_id") REFERENCES "games"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "refund_requests" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "game_id" TEXT NOT NULL,
  "payment_id" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT,
  "status" "WithdrawalStatus" NOT NULL DEFAULT 'CREATED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY ("game_id") REFERENCES "games"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actor_telegram_id" BIGINT NOT NULL,
  "action" TEXT NOT NULL,
  "target" TEXT,
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
