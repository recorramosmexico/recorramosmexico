/*
# Sistema de Anticipo y Pago de Saldo

## Descripcion
Agrega soporte completo para cobro de anticipo (deposito) al reservar y pago de saldo
restante por demanda del administrador.

## Cambios en `tours`
- `deposit_percentage` (numeric, default 40): Porcentaje de anticipo requerido al reservar.
  Minimo 10%, maximo 100%. El saldo restante se paga en efectivo al abordar.

## Cambios en `reservations`
- `deposit_percentage_applied` (numeric): Porcentaje usado al crear la reservacion.
- `deposit_amount_mxn` (numeric): Monto en MXN cobrado como anticipo via Stripe.
- `remaining_balance_mxn` (numeric): Saldo pendiente (total - anticipo).
- `balance_payment_requested_at` (timestamptz): Cuando el admin solicito pago del saldo.
- `balance_stripe_session_id` (text): Sesion Stripe para pagar el saldo.
- `payment_status` ahora acepta 'deposit_paid' ademas de los valores existentes.
*/

-- Agregar porcentaje de anticipo a tours
ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS deposit_percentage numeric NOT NULL DEFAULT 40
    CHECK (deposit_percentage >= 10 AND deposit_percentage <= 100);

-- Agregar campos de anticipo y saldo a reservaciones
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS deposit_percentage_applied numeric,
  ADD COLUMN IF NOT EXISTS deposit_amount_mxn numeric,
  ADD COLUMN IF NOT EXISTS remaining_balance_mxn numeric,
  ADD COLUMN IF NOT EXISTS balance_payment_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS balance_stripe_session_id text;

-- Reemplazar constraint de payment_status para incluir 'deposit_paid'
ALTER TABLE reservations
  DROP CONSTRAINT IF EXISTS reservations_payment_status_check;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_payment_status_check
  CHECK (payment_status IN ('pending', 'deposit_paid', 'paid', 'refunded', 'cancelled'));

-- Politica para que el viajero autenticado pueda actualizar su sesion de saldo
DROP POLICY IF EXISTS "allow_user_update_balance_session" ON reservations;
CREATE POLICY "allow_user_update_balance_session" ON reservations
  FOR UPDATE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
