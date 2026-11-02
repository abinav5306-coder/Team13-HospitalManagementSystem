-- ============================================================
-- Team 13 Hospital Management System
-- Automated Medicine Reminders & Patient Notifications Migration
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor)
-- ============================================================

-- -------------------------------------------------------
-- 1. NOTIFICATIONS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id          text NOT NULL,
    patient_username    text NOT NULL,
    medication_id       text,
    notification_title  text NOT NULL,
    notification_message text NOT NULL,
    medicine_name       text NOT NULL,
    dosage              text,
    scheduled_time      text,
    scheduled_date      date NOT NULL DEFAULT CURRENT_DATE,
    instructions        text,
    quantity            text,
    notification_type   text NOT NULL DEFAULT 'Medicine Due'
                            CHECK (notification_type IN ('Medicine Due', 'Medicine Upcoming', 'Snoozed Reminder', 'Test Reminder')),
    status              text NOT NULL DEFAULT 'Due'
                            CHECK (status IN ('Upcoming', 'Due', 'Read', 'Confirmed Taken', 'Snoozed', 'Missed')),
    is_read             boolean NOT NULL DEFAULT false,
    is_test             boolean NOT NULL DEFAULT false,
    reminder_key        text UNIQUE,
    snooze_until        timestamptz,
    taken_at            timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access on notifications"
    ON public.notifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated patient read policy
CREATE POLICY "Patients can view their own notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'email' = patient_username OR auth.uid()::text = patient_id);

-- -------------------------------------------------------
-- 2. MEDICATION ADHERENCE LOGS TABLE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medication_adherence (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_username    text NOT NULL,
    medication_id       text NOT NULL,
    medicine_name       text NOT NULL,
    dosage              text,
    scheduled_time      text,
    confirmed_at        timestamptz NOT NULL DEFAULT now(),
    status              text NOT NULL DEFAULT 'taken'
                            CHECK (status IN ('taken', 'skipped', 'snoozed')),
    notes               text,
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.medication_adherence ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access on medication_adherence"
    ON public.medication_adherence
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- -------------------------------------------------------
-- 3. INDEXES FOR HIGH-PERFORMANCE NOTIFICATIONS & SCHEDULER
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_patient_date
    ON public.notifications (patient_username, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_notifications_status
    ON public.notifications (status, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_reminder_key
    ON public.notifications (reminder_key);

CREATE INDEX IF NOT EXISTS idx_adherence_patient
    ON public.medication_adherence (patient_username, confirmed_at);
