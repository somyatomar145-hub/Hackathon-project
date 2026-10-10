-- Add customer fields for RevOps dashboard

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS renewal_date DATE;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS usage_percentage INTEGER
DEFAULT 0 CHECK (usage_percentage BETWEEN 0 AND 100);