-- Tradovate OAuth linking.
--
-- Adds the auth-method marker and relaxes the four credential columns to
-- nullable: an OAuth-linked account has no username, password, cid or secret,
-- because the journal never receives them.
--
-- Non-destructive. DROP NOT NULL only relaxes a constraint; no row is read,
-- rewritten or removed, and the new column carries a default so existing rows
-- are valid immediately.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run.
-- Do NOT run `prisma migrate dev` — see 20260910_jk_rule_engine.sql.

BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TradovateAuthMethod') THEN
    CREATE TYPE "TradovateAuthMethod" AS ENUM ('CREDENTIALS', 'OAUTH');
  END IF;
END $$;

ALTER TABLE "tradovate_accounts"
  ADD COLUMN IF NOT EXISTS "authMethod" "TradovateAuthMethod" NOT NULL DEFAULT 'CREDENTIALS',
  ADD COLUMN IF NOT EXISTS "refreshTokenEnc" TEXT,
  ALTER COLUMN "usernameEnc" DROP NOT NULL,
  ALTER COLUMN "passwordEnc" DROP NOT NULL,
  ALTER COLUMN "cidEnc"      DROP NOT NULL,
  ALTER COLUMN "secretEnc"   DROP NOT NULL;

COMMIT;
