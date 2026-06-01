-- ShadowGrid AI — Add dataset_type to zones
-- Demo zones (the 7 seeded Metroville zones) are tagged 'demo'.
-- Live zones (procedurally generated per city) are tagged 'live'.
-- Zones are no longer shared between datasets.

ALTER TABLE zones ADD COLUMN IF NOT EXISTS
  dataset_type TEXT NOT NULL DEFAULT 'demo'
  CHECK (dataset_type IN ('demo', 'live'));

CREATE INDEX IF NOT EXISTS idx_zones_dataset ON zones(dataset_type);

-- Tag all existing zones as demo
UPDATE zones SET dataset_type = 'demo' WHERE dataset_type IS NULL OR dataset_type = 'demo';

-- Allow anon/authenticated to insert and delete live zones only
CREATE POLICY "write_live_zones_insert" ON zones
  FOR INSERT TO anon, authenticated
  WITH CHECK (dataset_type = 'live');

CREATE POLICY "delete_live_zones" ON zones
  FOR DELETE TO anon, authenticated
  USING (dataset_type = 'live');
