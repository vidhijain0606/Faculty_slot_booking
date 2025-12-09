-- Fix: Ensure unique constraint exists on faculty_slots
-- Drop existing unique constraint if it exists (in case it has wrong columns)
DO $$ 
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find and drop any existing unique constraint on faculty_slots
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND t.relname = 'faculty_slots'
  AND c.contype = 'u'
  LIMIT 1;
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.faculty_slots DROP CONSTRAINT IF EXISTS ' || constraint_name;
  END IF;
END $$;

-- Add the correct unique constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.relname = 'faculty_slots'
    AND c.conname = 'faculty_slots_faculty_id_date_start_time_end_time_key'
  ) THEN
    ALTER TABLE public.faculty_slots 
    ADD CONSTRAINT faculty_slots_faculty_id_date_start_time_end_time_key 
    UNIQUE (faculty_id, date, start_time, end_time);
  END IF;
END $$;

-- Update trigger function to handle the constraint properly
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
    -- Use exception handling for conflict resolution
    BEGIN
      INSERT INTO public.faculty_slots (faculty_id, date, start_time, end_time, availability_id, status)
      VALUES (NEW.faculty_id, NEW.date, current_start, slot_end, NEW.id, 'available');
    EXCEPTION 
      WHEN unique_violation THEN
        -- Slot already exists, skip it silently
        NULL;
    END;
    
    -- Move to next slot
    current_start := slot_end;
  END LOOP;
  
  RETURN NEW;
END;
$$;
