-- Fix document upload RLS so faculty and scholars can insert their own files
-- and prevent double-booking of a slot by adding a unique constraint.

-- ------------------------------
-- Documents policies
-- ------------------------------
DROP POLICY IF EXISTS "Scholars can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Scholars can manage their own documents" ON public.documents;
DROP POLICY IF EXISTS "Scholars can delete their own documents" ON public.documents;
DROP POLICY IF EXISTS "Faculty can manage their own documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can manage documents" ON public.documents;

-- Scholars can insert/update/delete their own documents
CREATE POLICY "Scholars can upload documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'scholar')
    AND auth.uid() = faculty_id
  );

CREATE POLICY "Scholars can manage their own documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'scholar')
    AND auth.uid() = faculty_id
  );

CREATE POLICY "Scholars can delete their own documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'scholar')
    AND auth.uid() = faculty_id
  );

-- Faculty can insert/update/delete their own documents
CREATE POLICY "Faculty can manage their own documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'faculty')
    AND auth.uid() = faculty_id
  );

-- Admins: full access to all documents (optional but useful for support)
CREATE POLICY "Admins can manage documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------
-- Prevent double booking of a slot
-- ------------------------------
-- Ensure only one appointment can reference a given slot_id
CREATE UNIQUE INDEX IF NOT EXISTS appointments_slot_id_unique_not_null
  ON public.appointments (slot_id)
  WHERE slot_id IS NOT NULL;

