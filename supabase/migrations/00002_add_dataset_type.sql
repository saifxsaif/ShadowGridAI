-- ShadowGrid AI — Add dataset_type separation (idempotent)
--
-- Adds a dataset_type column ('demo' | 'live') to every dynamic table so the
-- stable demo dataset and the live ingested dataset can coexist in the same
-- database. Existing rows default to 'demo'. Zones are shared and excluded.
--
-- NOTE: If you are creating the schema fresh from 00001 (which already includes
-- dataset_type), this migration is a no-op thanks to IF NOT EXISTS guards.

ALTER TABLE risk_scores      ADD COLUMN IF NOT EXISTS dataset_type TEXT NOT NULL DEFAULT 'demo';
ALTER TABLE citizen_reports  ADD COLUMN IF NOT EXISTS dataset_type TEXT NOT NULL DEFAULT 'demo';
ALTER TABLE external_signals ADD COLUMN IF NOT EXISTS dataset_type TEXT NOT NULL DEFAULT 'demo';
ALTER TABLE recommendations  ADD COLUMN IF NOT EXISTS dataset_type TEXT NOT NULL DEFAULT 'demo';
ALTER TABLE failure_chains   ADD COLUMN IF NOT EXISTS dataset_type TEXT NOT NULL DEFAULT 'demo';
ALTER TABLE team_allocations ADD COLUMN IF NOT EXISTS dataset_type TEXT NOT NULL DEFAULT 'demo';

-- Constrain to the two valid values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'risk_scores_dataset_type_check') THEN
    ALTER TABLE risk_scores      ADD CONSTRAINT risk_scores_dataset_type_check      CHECK (dataset_type IN ('demo','live'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'citizen_reports_dataset_type_check') THEN
    ALTER TABLE citizen_reports  ADD CONSTRAINT citizen_reports_dataset_type_check  CHECK (dataset_type IN ('demo','live'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'external_signals_dataset_type_check') THEN
    ALTER TABLE external_signals ADD CONSTRAINT external_signals_dataset_type_check CHECK (dataset_type IN ('demo','live'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recommendations_dataset_type_check') THEN
    ALTER TABLE recommendations  ADD CONSTRAINT recommendations_dataset_type_check  CHECK (dataset_type IN ('demo','live'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'failure_chains_dataset_type_check') THEN
    ALTER TABLE failure_chains   ADD CONSTRAINT failure_chains_dataset_type_check   CHECK (dataset_type IN ('demo','live'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_allocations_dataset_type_check') THEN
    ALTER TABLE team_allocations ADD CONSTRAINT team_allocations_dataset_type_check CHECK (dataset_type IN ('demo','live'));
  END IF;
END $$;

-- Indexes for dataset-scoped queries
CREATE INDEX IF NOT EXISTS idx_risk_scores_dataset      ON risk_scores(dataset_type);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_dataset  ON citizen_reports(dataset_type);
CREATE INDEX IF NOT EXISTS idx_external_signals_dataset ON external_signals(dataset_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_dataset  ON recommendations(dataset_type);
CREATE INDEX IF NOT EXISTS idx_failure_chains_dataset   ON failure_chains(dataset_type);
CREATE INDEX IF NOT EXISTS idx_team_allocations_dataset ON team_allocations(dataset_type);

-- Tag any pre-existing rows as demo (defensive — column default already does this)
UPDATE risk_scores      SET dataset_type = 'demo' WHERE dataset_type IS NULL;
UPDATE citizen_reports  SET dataset_type = 'demo' WHERE dataset_type IS NULL;
UPDATE external_signals SET dataset_type = 'demo' WHERE dataset_type IS NULL;
UPDATE recommendations  SET dataset_type = 'demo' WHERE dataset_type IS NULL;
UPDATE failure_chains   SET dataset_type = 'demo' WHERE dataset_type IS NULL;
UPDATE team_allocations SET dataset_type = 'demo' WHERE dataset_type IS NULL;
