/*
# Fix get_tour_availability to handle departure_dates stored as JSON/text

## Problema
La funcion `get_tour_availability` asumia que `departure_dates` era un array nativo
de Postgres (text[]), pero la columna almacena los datos como texto en formato
JSON (ej. '["2026-07-25"]'). Al usar `FOREACH v_date IN ARRAY v_dates` fallaba con
"malformed array literal".

## Solucion
Usar `jsonb_array_elements_text` para iterar sobre las fechas cuando el valor
es JSON, con un fallback a array nativo por si acaso.
*/

CREATE OR REPLACE FUNCTION get_tour_availability(p_tour_id uuid)
RETURNS TABLE (departure_date text, available_spots integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dates_raw text;
  v_date text;
BEGIN
  SELECT departure_dates::text INTO v_dates_raw
  FROM tours
  WHERE id = p_tour_id;

  IF v_dates_raw IS NULL THEN
    RETURN;
  END IF;

  -- departure_dates se almacena como texto en formato JSON array (ej. '["2026-07-25"]')
  -- Usamos jsonb para extraer los elementos de forma segura
  FOR v_date IN
    SELECT jsonb_array_elements_text(v_dates_raw::jsonb)
  LOOP
    departure_date := v_date;
    available_spots := available_spots_for_date(p_tour_id, v_date);
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tour_availability(uuid) TO anon, authenticated;