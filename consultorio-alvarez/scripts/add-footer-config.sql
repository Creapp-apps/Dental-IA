-- Migration to add footer fields to landing_config table
ALTER TABLE public.landing_config 
ADD COLUMN IF NOT EXISTS footer_address text,
ADD COLUMN IF NOT EXISTS footer_phone text,
ADD COLUMN IF NOT EXISTS footer_email text,
ADD COLUMN IF NOT EXISTS footer_hours text;

-- These fields are optional and can be null, in which case the default constants will be used as fallback.
