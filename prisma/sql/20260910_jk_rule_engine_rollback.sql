-- Rollback for 20260910_jk_rule_engine.
--
-- Only needed if the change has to be undone. Columns are dropped before the
-- enum types, because a type still in use by a column cannot be dropped.
--
-- This DOES destroy anything written into these 24 columns. Right after the
-- migration that is nothing; once trades start recording stops, risk and rule
-- checks, running this loses that data. Every pre-existing column is untouched.

BEGIN;

ALTER TABLE "trades"
  DROP COLUMN IF EXISTS "addedToLoser",
  DROP COLUMN IF EXISTS "cisdRetested",
  DROP COLUMN IF EXISTS "emotion",
  DROP COLUMN IF EXISTS "entryTimeframe",
  DROP COLUMN IF EXISTS "entryTiming",
  DROP COLUMN IF EXISTS "entryTrigger",
  DROP COLUMN IF EXISTS "exitTrigger",
  DROP COLUMN IF EXISTS "fees",
  DROP COLUMN IF EXISTS "focusRating",
  DROP COLUMN IF EXISTS "followedPlan",
  DROP COLUMN IF EXISTS "fvgContextTf",
  DROP COLUMN IF EXISTS "grade",
  DROP COLUMN IF EXISTS "liquiditySource",
  DROP COLUMN IF EXISTS "maeR",
  DROP COLUMN IF EXISTS "mfeR",
  DROP COLUMN IF EXISTS "movedStop",
  DROP COLUMN IF EXISTS "mssConfirmed",
  DROP COLUMN IF EXISTS "quantity",
  DROP COLUMN IF EXISTS "riskAmount",
  DROP COLUMN IF EXISTS "ruleViolations",
  DROP COLUMN IF EXISTS "rulesCheckedAt",
  DROP COLUMN IF EXISTS "setupFamily",
  DROP COLUMN IF EXISTS "stopPrice",
  DROP COLUMN IF EXISTS "targetPrice";

DROP TYPE IF EXISTS "SetupFamily";
DROP TYPE IF EXISTS "LiquiditySource";
DROP TYPE IF EXISTS "EntryTrigger";
DROP TYPE IF EXISTS "EntryTimeframe";
DROP TYPE IF EXISTS "ContextTimeframe";
DROP TYPE IF EXISTS "TradeGrade";
DROP TYPE IF EXISTS "ExitTrigger";
DROP TYPE IF EXISTS "EntryTiming";
DROP TYPE IF EXISTS "EmotionalState";

COMMIT;
