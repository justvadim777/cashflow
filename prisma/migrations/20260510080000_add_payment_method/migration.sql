-- AddPaymentMethod enum and column to game_participants
CREATE TYPE "PaymentMethod" AS ENUM ('YUKASSA', 'CASH');
ALTER TABLE "game_participants" ADD COLUMN "payment_method" "PaymentMethod" NOT NULL DEFAULT 'YUKASSA';
