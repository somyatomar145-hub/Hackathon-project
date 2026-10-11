
-- AUTONOMOUS REVOPS AGENT
-- Record Sales Manager approval or rejection
-- No fake decisions are inserted.

CREATE OR REPLACE FUNCTION public.record_manager_decision(
    p_recommendation_id BIGINT,
    p_manager_id UUID,
    p_action TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    -- Only valid decisions are allowed
    IF p_action IS NULL
       OR p_action NOT IN ('Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid action';
    END IF;
    -- Ensure the manager is the authenticated user
    IF auth.uid() IS NULL
       OR auth.uid() <> p_manager_id THEN
        RAISE EXCEPTION 'Unauthorized manager';
    END IF;
    -- Verify the manager exists
    IF NOT EXISTS (
        SELECT 1
        FROM public.manager_profiles
        WHERE id = p_manager_id
    ) THEN
        RAISE EXCEPTION 'Manager not found';
    END IF;

    -- Update only a pending recommendation
    UPDATE public.ai_recommendations
    SET status = p_action
    WHERE id = p_recommendation_id
      AND status = 'Pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Recommendation not found or already reviewed';
    END IF;

    -- Record the manager's decision
    INSERT INTO public.action_history (
        recommendation_id,
        manager_id,
        action,
        notes
    )
    VALUES (
        p_recommendation_id,
        p_manager_id,
        p_action,
        p_notes
    );
END;
$$;

-- Restrict execution to authenticated users
REVOKE ALL ON FUNCTION public.record_manager_decision(
    BIGINT, UUID, TEXT, TEXT
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.record_manager_decision(
    BIGINT, UUID, TEXT, TEXT
) FROM anon;

GRANT EXECUTE ON FUNCTION public.record_manager_decision(
    BIGINT, UUID, TEXT, TEXT
) TO authenticated;

-- Prevent direct execution by backend service-role sessions
REVOKE ALL ON FUNCTION public.record_manager_decision(
    BIGINT, UUID, TEXT, TEXT
) FROM service_role;