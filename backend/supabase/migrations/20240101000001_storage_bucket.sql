-- Create storage bucket for recipe images
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the bucket
CREATE POLICY "Public Access to recipe images" ON storage.objects
FOR SELECT USING (bucket_id = 'recipe-images');

CREATE POLICY "Authenticated users can upload recipe images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'recipe-images');

CREATE POLICY "Authenticated users can update recipe images" ON storage.objects
FOR UPDATE USING (bucket_id = 'recipe-images');

CREATE POLICY "Authenticated users can delete recipe images" ON storage.objects
FOR DELETE USING (bucket_id = 'recipe-images');
