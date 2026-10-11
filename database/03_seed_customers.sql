
-- AUTONOMOUS REVOPS AGENT
-- 50 Demo Customers
-- Created by Somya

INSERT INTO public.customers (
    name,
    email,
    company,
    industry,
    phone,
    monthly_revenue,
    last_purchase_date,
    renewal_date,
    usage_percentage
)
SELECT
    (ARRAY[
        'Aarav', 'Priya', 'Rahul', 'Neha', 'Rohan',
        'Ananya', 'Karan', 'Sneha', 'Vivek', 'Isha'
    ])[((n - 1) % 10) + 1] || ' ' ||
    (ARRAY[
        'Sharma', 'Verma', 'Patel', 'Gupta', 'Mehta'
    ])[((n - 1) % 5) + 1] || ' ' || n,

    'customer' || n || '@example.com',

    (ARRAY[
        'TechNova', 'GrowthHub', 'CloudWorks',
        'RetailPro', 'DataSphere'
    ])[((n - 1) % 5) + 1] || ' ' || n,

    (ARRAY[
        'Technology', 'Retail', 'Finance',
        'Healthcare', 'Manufacturing'
    ])[((n - 1) % 5) + 1],

    '90000' || LPAD(n::TEXT, 5, '0'),

    (5000 + n * 750)::NUMERIC(12,2),

    CURRENT_DATE - (n * 2),

    CURRENT_DATE + (5 + n * 3),

    CASE
        WHEN n % 3 = 0 THEN 20
        WHEN n % 3 = 1 THEN 55
        ELSE 90
    END

FROM generate_series(1, 50) AS n

ON CONFLICT (email) DO NOTHING;

-- Verify inserted demo customers
SELECT COUNT(*) AS demo_customer_count
FROM public.customers
WHERE email ~ '^customer([1-9]|[1-4][0-9]|50)@example\.com$';
