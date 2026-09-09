-- JK rule engine: model taxonomy, risk/excursion fields and derived discipline.
--
-- Additive only: 9 enum types and 24 nullable columns on "trades".
-- Nothing is removed, retyped or backfilled, so existing rows are untouched and
-- the currently deployed app keeps working exactly as it does now.
--
-- Safe to run twice: every statement is guarded, and the whole script runs in a
-- single transaction, so a failure anywhere leaves the database as it was.
--
-- HOW TO APPLY: paste this whole file into the Supabase SQL Editor and run it.
--
-- Do NOT run `prisma migrate dev` on this project. There is no migration history
-- and no baseline, so Prisma would treat the live database as drifted and offer
-- to reset it — which would drop every student's trades. `prisma db push` (the
-- command this project has always used) stays safe.

BEGIN;

-- Postgres has no CREATE TYPE IF NOT EXISTS, so each enum is guarded by hand.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SetupFamily') THEN
    CREATE TYPE "SetupFamily" AS ENUM ('LIQUIDITY_SWEEP', 'SMT');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LiquiditySource') THEN
    CREATE TYPE "LiquiditySource" AS ENUM ('ASIA_HIGH', 'ASIA_LOW', 'LONDON_HIGH', 'LONDON_LOW', 'PDH', 'PDL', 'PWH', 'PWL', 'PMH', 'PML', 'OTHER');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EntryTrigger') THEN
    CREATE TYPE "EntryTrigger" AS ENUM ('FVG', 'IFVG', 'CISD');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EntryTimeframe') THEN
    CREATE TYPE "EntryTimeframe" AS ENUM ('M1', 'M3', 'M5');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContextTimeframe') THEN
    CREATE TYPE "ContextTimeframe" AS ENUM ('M5', 'M15', 'H1', 'H4', 'H6', 'D1', 'W1');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TradeGrade') THEN
    CREATE TYPE "TradeGrade" AS ENUM ('A', 'B', 'C');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExitTrigger') THEN
    CREATE TYPE "ExitTrigger" AS ENUM ('TARGET', 'STOP', 'MANUAL_EARLY', 'TRAIL', 'TIME_STOP', 'PANIC', 'END_OF_DAY');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EntryTiming') THEN
    CREATE TYPE "EntryTiming" AS ENUM ('EARLY', 'ON_TIME', 'LATE', 'CHASED');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmotionalState') THEN
    CREATE TYPE "EmotionalState" AS ENUM ('CALM', 'FOCUSED', 'ANXIOUS', 'FOMO', 'REVENGE', 'OVERCONFIDENT', 'BORED', 'TIRED', 'PRESSURED');
  END IF;
END $$;

ALTER TABLE "trades"
  ADD COLUMN IF NOT EXISTS "addedToLoser" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "cisdRetested" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "emotion" "EmotionalState",
  ADD COLUMN IF NOT EXISTS "entryTimeframe" "EntryTimeframe",
  ADD COLUMN IF NOT EXISTS "entryTiming" "EntryTiming",
  ADD COLUMN IF NOT EXISTS "entryTrigger" "EntryTrigger",
  ADD COLUMN IF NOT EXISTS "exitTrigger" "ExitTrigger",
  ADD COLUMN IF NOT EXISTS "fees" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "focusRating" INTEGER,
  ADD COLUMN IF NOT EXISTS "followedPlan" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "fvgContextTf" "ContextTimeframe",
  ADD COLUMN IF NOT EXISTS "grade" "TradeGrade",
  ADD COLUMN IF NOT EXISTS "liquiditySource" "LiquiditySource",
  ADD COLUMN IF NOT EXISTS "maeR" DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS "mfeR" DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS "movedStop" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "mssConfirmed" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "quantity" INTEGER,
  ADD COLUMN IF NOT EXISTS "riskAmount" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "ruleViolations" TEXT,
  ADD COLUMN IF NOT EXISTS "rulesCheckedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "setupFamily" "SetupFamily",
  ADD COLUMN IF NOT EXISTS "stopPrice" DECIMAL(12,5),
  ADD COLUMN IF NOT EXISTS "targetPrice" DECIMAL(12,5);

COMMIT;
