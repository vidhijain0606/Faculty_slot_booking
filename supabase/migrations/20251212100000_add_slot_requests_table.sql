-- Slot requests intake table
CREATE TABLE IF NOT EXISTS public.slot_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_name TEXT NOT NULL,
  emp_id TEXT NOT NULL,
  registration TEXT NOT NULL,
  meeting_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.slot_requests ENABLE ROW LEVEL SECURITY;

-- Open policy (adjust later if needed)
DROP POLICY IF EXISTS "slot_requests_all" ON public.slot_requests;
CREATE POLICY "slot_requests_all"
  ON public.slot_requests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

