/*
# Control de capacidad real por fecha en reservas

## Resumen
Este cambio implementa control de capacidad real por fecha de salida para evitar
sobreventas en los tours. Antes, el sitio mostraba `max_capacity` como "lugares
disponibles" sin restar las reservas ya hechas, y no había validación en la base
de datos. Ahora:

1. Una función `available_spots_for_date()` calcula los lugares disponibles
   para un tour y fecha específicos, restando los viajeros ya reservados
   (solo reservas activas: pendientes, con anticipo pagado y pagadas —
   se excluyen canceladas y reembolsadas).
2. Un trigger `enforce_tour_capacity` se ejecuta ANTES de insertar una reserva
   y rechaza la operación si los viajeros solicitados superan los lugares
   disponibles.
3. Una función RPC `get_tour_availability()` devuelve los lugares disponibles
   para todas las fechas de salida de un tour, para que el frontend los muestre.

## Funciones nuevas
- `available_spots_for_date(p_tour_id uuid, p_departure_date text)`:
  Devuelve el número de lugares disponibles (entero). Resta los viajeros de
  reservas activas a `max_capacity` del tour.
- `get_tour_availability(p_tour_id uuid)`:
  Devuelve una tabla con columnas (departure_date text, available_spots int)
  para cada fecha de salida del tour.

## Trigger nuevo
- `enforce_tour_capacity` (BEFORE INSERT ON reservations):
  Llama a `available_spots_for_date` y lanza una excepción si
  `NEW.travelers` supera los lugares disponibles. El mensaje de error es
  descriptivo para que el frontend pueda mostrarlo.

## Notas importantes
- Las reservas con estado `cancelled` o `refunded` NO cuentan para la capacidad.
- El trigger solo aplica en INSERT, no en UPDATE (cambiar estado de una
  reserva existente no la vuelve a validar — solo importan los inserts nuevos).
- Todas las funciones son SECURITY DEFINER para que el cliente anon pueda
  consultar disponibilidad sin problemas de RLS.
*/

-- ============================================================
-- 1. Función: lugares disponibles para un tour y fecha
-- ============================================================
CREATE OR REPLACE FUNCTION available_spots_for_date(
  p_tour_id uuid,
  p_departure_date text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_capacity integer;
  v_reserved integer;
  v_available integer;
BEGIN
  SELECT max_capacity INTO v_max_capacity
  FROM tours
  WHERE id = p_tour_id;

  IF v_max_capacity IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(travelers), 0) INTO v_reserved
  FROM reservations
  WHERE tour_id = p_tour_id
    AND departure_date = p_departure_date
    AND payment_status IN ('pending', 'deposit_paid', 'paid');

  v_available := v_max_capacity - v_reserved;
  IF v_available < 0 THEN
    v_available := 0;
  END IF;

  RETURN v_available;
END;
$$;

-- ============================================================
-- 2. Función RPC: disponibilidad para todas las fechas de un tour
-- ============================================================
CREATE OR REPLACE FUNCTION get_tour_availability(p_tour_id uuid)
RETURNS TABLE (departure_date text, available_spots integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dates text[];
  v_date text;
BEGIN
  SELECT departure_dates INTO v_dates
  FROM tours
  WHERE id = p_tour_id;

  IF v_dates IS NULL THEN
    RETURN;
  END IF;

  FOREACH v_date IN ARRAY v_dates
  LOOP
    departure_date := v_date;
    available_spots := available_spots_for_date(p_tour_id, v_date);
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Permitir que anon y authenticated ejecuten las funciones RPC
GRANT EXECUTE ON FUNCTION available_spots_for_date(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_tour_availability(uuid) TO anon, authenticated;

-- ============================================================
-- 3. Trigger: rechazar inserts que superen la capacidad
-- ============================================================
CREATE OR REPLACE FUNCTION check_reservation_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available integer;
BEGIN
  v_available := available_spots_for_date(NEW.tour_id, NEW.departure_date);

  IF NEW.travelers > v_available THEN
    RAISE EXCEPTION 'Capacidad insuficiente: solo quedan % lugares disponibles para esta fecha (solicitados: %)',
      v_available, NEW.travelers
      USING ERRCODE = '40001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tour_capacity ON reservations;
CREATE TRIGGER enforce_tour_capacity
  BEFORE INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION check_reservation_capacity();