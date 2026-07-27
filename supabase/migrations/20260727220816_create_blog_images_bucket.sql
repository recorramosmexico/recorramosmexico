/*
# Create blog-images storage bucket

1. Storage
- Create a public bucket `blog-images` for storing blog article cover images uploaded from the admin panel.
- 10MB file size limit, images only.
2. Security
- Public read (anyone can view cover images).
- Authenticated insert (only logged-in admins can upload).
- Authenticated update/delete (only logged-in admins can manage).
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read blog images" ON storage.objects;
CREATE POLICY "Public read blog images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "Auth upload blog images" ON storage.objects;
CREATE POLICY "Auth upload blog images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "Auth update blog images" ON storage.objects;
CREATE POLICY "Auth update blog images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'blog-images') WITH CHECK (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "Auth delete blog images" ON storage.objects;
CREATE POLICY "Auth delete blog images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'blog-images');
