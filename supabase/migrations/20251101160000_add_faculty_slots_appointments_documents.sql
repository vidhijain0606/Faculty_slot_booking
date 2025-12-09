-- Create faculty_slots table for individual time slots
CREATE TABLE IF NOT EXISTS public.faculty_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'booked', 'cancelled')),
  availability_id UUID REFERENCES public.availability(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (faculty_id, date, start_time, end_time)
);

ALTER TABLE public.faculty_slots ENABLE ROW LEVEL SECURITY;

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scholar_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scholar_name TEXT NOT NULL,
  scholar_email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  slot_id UUID REFERENCES public.faculty_slots(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for faculty_slots
CREATE POLICY "Everyone can view available faculty_slots"
  ON public.faculty_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Faculty can manage their own slots"
  ON public.faculty_slots FOR ALL
  TO authenticated
  USING (auth.uid() = faculty_id);

-- RLS Policies for appointments
CREATE POLICY "Users can view their own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = scholar_id OR auth.uid() = faculty_id);

CREATE POLICY "Scholars can create appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = scholar_id);

CREATE POLICY "Users can update their own appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = scholar_id OR auth.uid() = faculty_id);

-- RLS Policies for documents
CREATE POLICY "Everyone can view documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Faculty can manage their own documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (auth.uid() = faculty_id);

-- Function to generate slots from availability
CREATE OR REPLACE FUNCTION public.generate_slots_from_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  slot_start TIME;
  slot_end TIME;
  current_start TIME;
  slot_duration_minutes INTEGER;
BEGIN
  -- Get slot duration from availability or use default 30 minutes
  slot_duration_minutes := COALESCE(NEW.slot_duration, 30);
  
  -- Start from the availability start_time
  current_start := NEW.start_time;
  
  -- Generate slots until we reach the end_time
  WHILE current_start < NEW.end_time LOOP
    -- Calculate slot end time
    slot_end := current_start + (slot_duration_minutes || ' minutes')::INTERVAL;
    
    -- Don't create a slot if it would exceed the end_time
    IF slot_end > NEW.end_time THEN
      EXIT;
    END IF;
    
    -- Insert the slot if it doesn't already exist
    INSERT INTO public.faculty_slots (faculty_id, date, start_time, end_time, availability_id, status)
    VALUES (NEW.faculty_id, NEW.date, current_start, slot_end, NEW.id, 'available')
    ON CONFLICT (faculty_id, date, start_time, end_time) DO NOTHING;
    
    -- Move to next slot
    current_start := slot_end;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate slots when availability is added
CREATE TRIGGER generate_slots_trigger
  AFTER INSERT ON public.availability
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_slots_from_availability();

