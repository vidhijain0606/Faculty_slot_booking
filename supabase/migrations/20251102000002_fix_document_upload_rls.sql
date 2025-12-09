-- Fix document upload RLS policy for scholars
-- Drop existing policy and recreate with proper check

DROP POLICY IF EXISTS "Scholars can upload documents" ON public.documents;

-- Allow scholars to insert documents using their own user ID as faculty_id
CREATE POLICY "Scholars can upload documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'scholar') AND 
    auth.uid() = faculty_id
  );

-- Also allow scholars to update/delete their own documents
CREATE POLICY "Scholars can manage their own documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'scholar') AND 
    auth.uid() = faculty_id
  );

CREATE POLICY "Scholars can delete their own documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'scholar') AND 
    auth.uid() = faculty_id
  );

