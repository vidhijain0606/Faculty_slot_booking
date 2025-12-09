-- Fix: Add availability_id column to faculty_slots if it doesn't exist
DO $$ 
BEGIN
  -- Check if faculty_slots table exists first
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'faculty_slots'
  ) THEN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'faculty_slots' 
      AND column_name = 'availability_id'
    ) THEN
      ALTER TABLE public.faculty_slots 
      ADD COLUMN availability_id UUID REFERENCES public.availability(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Update the trigger function (simplified version)
CREATE OR REPLACE FUNCTION public.generate_slots_from_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_start TIME;
  slot_end TIME;
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
