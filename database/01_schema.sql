
-- ============================================
-- AUTONOMOUS REVOPS AGENT
-- DATABASE SCHEMA - SOMYA
-- PostgreSQL / Supabase
-- ============================================

-- TABLE 1: CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    company TEXT,
    phone TEXT,
    monthly_revenue NUMERIC(12,2) NOT NULL DEFAULT 0
        CHECK (monthly_revenue >= 0),
    renewal_date DATE,
    last_purchase_date DATE,
    usage_percentage INTEGER NOT NULL DEFAULT 0
        CHECK (usage_percentage BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE 2: SALES
CREATE TABLE IF NOT EXISTS public.sales (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL
        REFERENCES public.customers(id),
    amount NUMERIC(12,2) NOT NULL
        CHECK (amount >= 0),
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    product_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE 3: AI RISK ASSESSMENTS
CREATE TABLE IF NOT EXISTS public.risk_assessments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL
        REFERENCES public.customers(id),
    risk_level TEXT NOT NULL
        CHECK (risk_level IN ('Low', 'Medium', 'High')),
    risk_score INTEGER NOT NULL
        CHECK (risk_score BETWEEN 0 AND 100),
    explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE 4: AI RECOMMENDATIONS
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL
        REFERENCES public.customers(id),
    risk_assessment_id BIGINT
        REFERENCES public.risk_assessments(id),
    recommendation TEXT NOT NULL,
    email_subject TEXT,
    email_body TEXT,
    status TEXT NOT NULL DEFAULT 'Pending'
        CHECK (
            status IN ('Pending', 'Approved', 'Rejected')
        ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE 5: SALES MANAGER PROFILE
-- Supabase Authentication stores login credentials.
CREATE TABLE IF NOT EXISTS public.manager_profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE 6: ACTION HISTORY
CREATE TABLE IF NOT EXISTS public.action_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recommendation_id BIGINT NOT NULL
        REFERENCES public.ai_recommendations(id),
    manager_id UUID NOT NULL
        REFERENCES public.manager_profiles(id),
    action TEXT NOT NULL
        CHECK (action IN ('Approved', 'Rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR FASTER QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sales_customer
ON public.sales(customer_id);

CREATE INDEX IF NOT EXISTS idx_risk_customer
ON public.risk_assessments(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_customer
ON public.ai_recommendations(customer_id);

CREATE INDEX IF NOT EXISTS idx_recommendations_status
ON public.ai_recommendations(status);

CREATE INDEX IF NOT EXISTS idx_action_history_recommendation
ON public.action_history(recommendation_id);

-- ============================================
-- DATABASE SECURITY
-- ============================================

ALTER TABLE public.customers
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sales
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.risk_assessments
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_recommendations
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.manager_profiles
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.action_history
ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFY TABLE CREATION
-- ============================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'customers',
    'sales',
    'risk_assessments',
    'ai_recommendations',
    'manager_profiles',
    'action_history'
)
ORDER BY table_name;
