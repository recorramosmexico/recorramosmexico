ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
