-- Add policy to allow scholars to upload documents
-- Run this if you've already run the main migration

CREATE POLICY "Scholars can upload documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'scholar'));

