-- ============================================
-- COMPLETE FRESH SETUP - DROP AND RECREATE ALL
-- ============================================
-- This file drops all existing tables and creates a fresh database structure
-- Run this in Supabase SQL Editor to start completely fresh

-- ============================================
-- STEP 1: DROP ALL EXISTING TABLES AND FUNCTIONS
-- ============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS generate_slots_trigger ON public.availability;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS public.generate_slots_from_availability() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role) CASCADE;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.faculty_slots CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.availability CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.time_off CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop enum type
DROP TYPE IF EXISTS public.app_role CASCADE;

-- ============================================
-- STEP 2: CREATE ENUMS
-- ============================================

CREATE TYPE public.app_role AS ENUM ('scholar', 'faculty', 'admin');

-- ============================================
-- STEP 3: CREATE TABLES
-- ============================================

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'scholar',
  UNIQUE (user_id)
);

-- Availability table (for admin to create time slots)
CREATE TABLE public.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (faculty_id, date, start_time)
);

-- Faculty slots table (individual bookable slots)
CREATE TABLE public.faculty_slots (
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

-- Appointments table
CREATE TABLE public.appointments (
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

-- Documents table
CREATE TABLE public.documents (
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

-- ============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: CREATE FUNCTIONS
-- ============================================

-- Function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;
  
  -- Auto-create user_roles entry with 'scholar' as default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'scholar')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Function to generate slots from availability
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

-- ============================================
-- STEP 6: CREATE TRIGGERS
-- ============================================

-- Trigger to create profile and role on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to auto-generate slots when availability is added
CREATE TRIGGER generate_slots_trigger
  AFTER INSERT ON public.availability
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_slots_from_availability();

-- ============================================
-- STEP 7: CREATE RLS POLICIES
-- ============================================

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role during signup"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Availability policies
CREATE POLICY "Everyone can view availability"
  ON public.availability FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage availability"
  ON public.availability FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Faculty slots policies
CREATE POLICY "Everyone can view available faculty_slots"
  ON public.faculty_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage all slots"
  ON public.faculty_slots FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Appointments policies
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

CREATE POLICY "Admins can view all appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Documents policies
CREATE POLICY "Everyone can view documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Scholars can upload documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'scholar') AND 
    auth.uid() = faculty_id
  );

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

-- ============================================
-- STEP 8: NOTES
-- ============================================
-- 
-- To create an admin user:
-- 1. User signs up normally (will be created as 'scholar')
-- 2. Run this SQL to make them admin:
--    UPDATE user_roles SET role = 'admin' WHERE user_id = 'USER_ID_HERE';
--
-- Storage bucket setup:
-- 1. Go to Supabase Storage
-- 2. Create a bucket named 'documents'
-- 3. Make it public or set appropriate policies
--
-- ============================================

