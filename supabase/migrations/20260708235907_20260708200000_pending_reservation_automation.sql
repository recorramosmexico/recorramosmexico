/*
# Pending Reservation Automation

Adds automated lifecycle management for pending reservations: payment completion
tracking, 24-hour reminder emails, and 72-hour auto-cancellation.

## Changes

### Modified Tables
- `reservations`
  - `payment_method_type` (text, default 'card'): records which payment method
    was originally selected (card, oxxo, bank_transfer).
  - `reminder_sent_at` (timestamptz, nullable): timestamp when the 24-hour
    reminder email was sent. Prevents duplicate reminders across hourly cron runs.

### New Extensions
- `pg_cron`: Job scheduler for periodic SQL tasks.
- `pg_net`: Async HTTP client for calling Edge Functions from SQL.

### New Scheduled Jobs (pg_cron)
- `process-reservations-hourly`: Runs every hour. Calls the
  `process-reservations` Edge Function which cancels reservations >72h pending
  and sends 24-hour reminder emails.

## Important Notes
1. 72-hour expiry is uniform across card, OXXO, and bank transfer.
2. `reminder_sent_at` is the idempotency guard against duplicate reminder emails.
3. Cancelled reservations remain visible in the admin panel for audit purposes.
*/

-- ─── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- ─── Columns on reservations ───────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'payment_method_type'
  ) THEN
    ALTER TABLE reservations ADD COLUMN payment_method_type text NOT NULL DEFAULT 'card';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'reminder_sent_at'
  ) THEN
    ALTER TABLE reservations ADD COLUMN reminder_sent_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- ─── Cron job (idempotent: unschedule if exists, then schedule) ────────────────
SELECT cron.unschedule('process-reservations-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-reservations-hourly'
);

SELECT cron.schedule(
  'process-reservations-hourly',
  '0 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://oqyqyxlrczsbcozywiag.supabase.co/functions/v1/process-reservations',
    body := '{}',
    content_type := 'application/json',
    headers := '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xeXF5eGxyY3pzYmNvenl3aWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODM3MDUsImV4cCI6MjA5MTc1OTcwNX0.epTOhFVmEHitGU-03vlaQcHJazciEC51DtD2y_9nLaU","Content-Type":"application/json"}'
  );
  $$
);
