UPDATE "UserPreference"
SET "theme" = 'light'
WHERE "theme" = 'system';

ALTER TABLE "UserPreference"
ALTER COLUMN "theme" SET DEFAULT 'light';

ALTER TABLE "UserPreference"
DROP COLUMN IF EXISTS "accentColor";
