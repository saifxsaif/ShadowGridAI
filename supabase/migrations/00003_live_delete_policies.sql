-- ShadowGrid AI — Live-only write policies
--
-- The browser (anon key) may only INSERT / UPDATE / DELETE rows belonging to
-- the LIVE dataset. The DEMO dataset is therefore immutable from the client,
-- keeping it stable and presentation-safe. Reads remain public for both
-- datasets (the app filters by dataset_type).
--
-- Idempotent: drops any prior policy of the same name first.

-- citizen_reports ---------------------------------------------------------------
DROP POLICY IF EXISTS "public_insert_citizen_reports" ON citizen_reports;
DROP POLICY IF EXISTS "write_live_citizen_reports_insert" ON citizen_reports;
DROP POLICY IF EXISTS "delete_live_citizen_reports" ON citizen_reports;
CREATE POLICY "write_live_citizen_reports_insert" ON citizen_reports
  FOR INSERT TO anon, authenticated WITH CHECK (dataset_type = 'live');
CREATE POLICY "delete_live_citizen_reports" ON citizen_reports
  FOR DELETE TO anon, authenticated USING (dataset_type = 'live');

-- Helper block to create insert/update/delete live policies on the derived tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['risk_scores','external_signals','recommendations','failure_chains','team_allocations']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'write_live_' || t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'write_live_' || t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'delete_live_' || t, t);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO anon, authenticated WITH CHECK (dataset_type = ''live'')',
      'write_live_' || t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO anon, authenticated USING (dataset_type = ''live'') WITH CHECK (dataset_type = ''live'')',
      'write_live_' || t || '_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE TO anon, authenticated USING (dataset_type = ''live'')',
      'delete_live_' || t, t);
  END LOOP;
END $$;
