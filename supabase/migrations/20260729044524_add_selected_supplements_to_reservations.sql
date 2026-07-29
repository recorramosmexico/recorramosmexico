/*
# Add selected_supplements column to reservations table

Adds a `selected_supplements` JSONB column to the `reservations` table
to store the supplements (e.g. double room, triple room) that the traveler
selected when booking, along with their prices. Default is NULL (no supplements).
*/

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS selected_supplements jsonb;
