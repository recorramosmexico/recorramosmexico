/*
# Add presale price and deadline to tours

1. Modified Tables
- `tours`
  - `presale_price_mxn` (numeric, nullable): special price offered during the presale window.
    When NULL, no presale price is configured and the normal `price_mxn` always applies.
  - `presale_end_date` (date, nullable): last date (inclusive) the presale price is honored.
    After this date the normal `price_mxn` is charged. Only meaningful when `presale_price_mxn` is NOT NULL.

2. Notes
- Both columns are nullable so existing tours are unaffected (they keep using `price_mxn` only).
- The application logic decides which price to use: if `presale_price_mxn` is set AND
  `presale_end_date` is today or in the future, the presale price applies; otherwise `price_mxn`.
*/

ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS presale_price_mxn numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS presale_end_date date DEFAULT NULL;
