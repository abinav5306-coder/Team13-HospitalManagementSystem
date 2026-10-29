-- ============================================================
-- DD-14 Migration: Doctors & Appointments Tables
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor)
-- ============================================================

-- -------------------------------------------------------
-- 1. DOCTORS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctors (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name      text NOT NULL,
    email          text NOT NULL UNIQUE,
    mobile         text NOT NULL,
    specialization text NOT NULL,
    availability   text NOT NULL DEFAULT 'available',
    created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on doctors"
    ON public.doctors
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- -------------------------------------------------------
-- 2. APPOINTMENTS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id       uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id        uuid NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    appointment_date date NOT NULL,
    appointment_time time NOT NULL,
    reason           text,
    status           text NOT NULL DEFAULT 'scheduled'
                         CHECK (status IN ('scheduled','completed','cancelled')),
    created_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (doctor_id, appointment_date, appointment_time)
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on appointments"
    ON public.appointments
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- -------------------------------------------------------
-- 3. Helpful indexes
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date
    ON public.appointments (doctor_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_patient
    ON public.appointments (patient_id);
