
-- AUTONOMOUS REVOPS AGENT
-- Demo recommendations and personalized email drafts
-- These are sample records, NOT actual AI-generated output.

INSERT INTO public.ai_recommendations (
    customer_id,
    risk_assessment_id,
    recommendation,
    email_subject,
    email_body,
    status
)
SELECT
    c.id,
    r.id,

    CASE r.risk_level
        WHEN 'High' THEN
            'Schedule an urgent customer success call with '
            || c.name ||
            ' to address low product usage and discuss renewal support.'

        WHEN 'Medium' THEN
            'Offer ' || c.name ||
            ' a personalized product training session to increase engagement.'

        ELSE
            'Explore an upgrade or upselling opportunity with '
            || c.name ||
            ' based on strong product usage.'
    END,

    CASE r.risk_level
        WHEN 'High' THEN
            'Let us help you get more value from your subscription'
        WHEN 'Medium' THEN
            'A personalized training session for your team'
        ELSE
            'Explore more opportunities with our premium features'
    END,

    'Hi ' || c.name || ',' || E'\n\n' ||

    CASE r.risk_level
        WHEN 'High' THEN
            'We noticed that your team at ' || c.company ||
            ' may not be using all the features available in your subscription. '
            || 'We would love to schedule a quick call to understand your needs '
            || 'and help you get more value from our platform.'

        WHEN 'Medium' THEN
            'Thank you for being part of our platform. '
            || 'We would love to offer your team at ' || c.company ||
            ' a personalized training session to help you explore '
            || 'more features and improve productivity.'

        ELSE
            'We are glad to see strong engagement from '
            || c.company ||
            '. We would love to introduce some premium features '
            || 'that could help your team achieve even more.'
    END

    || E'\n\nBest regards,\nCustomer Success Team',

    'Pending'

FROM public.customers AS c

JOIN LATERAL (
    SELECT
        ra.id,
        ra.risk_level
    FROM public.risk_assessments AS ra
    WHERE ra.customer_id = c.id
    ORDER BY ra.created_at DESC, ra.id DESC
    LIMIT 1
) AS r ON TRUE

WHERE c.email ~
'^customer([1-9]|[1-4][0-9]|50)@example\.com$'

AND NOT EXISTS (
    SELECT 1
    FROM public.ai_recommendations AS ar
    WHERE ar.customer_id = c.id
);

-- Verify recommendations by approval status
SELECT
    status,
    COUNT(*) AS total_recommendations
FROM public.ai_recommendations
GROUP BY status
ORDER BY status;
