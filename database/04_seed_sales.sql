
-- AUTONOMOUS REVOPS AGENT
-- Somya: Sales History Seed Data
-- Four transactions for each of 50 demo customers

INSERT INTO public.sales (
    customer_id,
    amount,
    sale_date,
    product_name
)
SELECT
    c.id,
    (2000 + s.n * 1500 + (c.id % 7) * 300)::NUMERIC(12,2),
    CURRENT_DATE - (s.n * 12 + (c.id % 10))::INTEGER,
    'Subscription Plan ' || s.n
FROM public.customers AS c
CROSS JOIN generate_series(1, 4) AS s(n)
WHERE c.email ~ '^customer([1-9]|[1-4][0-9]|50)@example\.com$'
AND NOT EXISTS (
    SELECT 1
    FROM public.sales AS existing
    WHERE existing.customer_id = c.id
      AND existing.product_name = 'Subscription Plan ' || s.n
);

-- Verify total demo sales
SELECT COUNT(*) AS total_sales
FROM public.sales AS s
JOIN public.customers AS c
    ON s.customer_id = c.id
WHERE c.email ~ '^customer([1-9]|[1-4][0-9]|50)@example\.com$';
