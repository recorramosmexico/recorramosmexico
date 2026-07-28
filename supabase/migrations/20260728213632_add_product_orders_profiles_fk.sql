-- Add foreign key so admin can join product_orders with profiles
ALTER TABLE product_orders
  ADD CONSTRAINT product_orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;