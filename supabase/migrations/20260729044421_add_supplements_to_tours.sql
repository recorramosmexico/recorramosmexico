/*
# Add supplements column to tours table

Adds a `supplements` JSONB column to the `tours` table.
Each supplement is an object with `{ name: string, price: number }`.
These are optional add-ons (e.g. triple room, double room) whose price
is added on top of the base tour price when selected by the traveler.

Default is an empty array `[]`.
*/

ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS supplements jsonb NOT NULL DEFAULT '[]'::jsonb;
