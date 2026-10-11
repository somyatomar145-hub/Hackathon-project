
-- AUTONOMOUS REVOPS AGENT
-- Demo risk assessments for 50 customers
-- These are rule-based demo scores, NOT AI predictions.

INSERT INTO public.risk_assessments (
    customer_id,
    risk_level,
    risk_score,
    explanation
)
SELECT
    c.id,

    CASE
        WHEN c.usage_percentage <= 30 THEN 'High'
        WHEN c.usage_percentage <= 60 THEN 'Medium'
        ELSE 'Low'
    END,

    CASE
        WHEN c.usage_percentage <= 30 THEN 85
        WHEN c.usage_percentage <= 60 THEN 55
        ELSE 15
    END,

    CASE
        WHEN c.usage_percentage <= 30
            THEN 'High churn risk: low product usage. Customer needs immediate attention.'
        WHEN c.usage_percentage <= 60
            THEN 'Medium churn risk: moderate product usage. Recommend engagement follow-up.'
        ELSE
            'Low churn risk: strong product usage and healthy engagement.'
    END

FROM public.customers AS c
WHERE c.email ~ '^customer([1-9]|[1-4][0-9]|50)@example\.com$'
AND NOT EXISTS (
    SELECT 1
    FROM public.risk_assessments AS r
    WHERE r.customer_id = c.id
);

-- Check risk distribution
SELECT
    risk_level,
    COUNT(*) AS total_customers
FROM public.risk_assessments
GROUP BY risk_level
ORDER BY risk_level;
