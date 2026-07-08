/*
# Stripe Async Payments Support

Adds support for asynchronous payment methods (OXXO, SPEI bank transfers).

## Changes

### Modified Tables
- `stripe_orders`
  - `payment_intent_id`: made nullable — async sessions may not have a confirmed
    intent at `checkout.session.completed` time
  - `payment_method_type` (text, default 'card'): records which payment method was
    used (card, oxxo, customer_balance/bank_transfer) so the admin can see how each
    order was paid

## Notes
- No data is lost; existing rows keep their payment_intent_id values.
- The webhook will populate payment_method_type for all new orders.
*/

ALTER TABLE stripe_orders
  ALTER COLUMN payment_intent_id DROP NOT NULL;

ALTER TABLE stripe_orders
  ADD COLUMN IF NOT EXISTS payment_method_type text NOT NULL DEFAULT 'card';
