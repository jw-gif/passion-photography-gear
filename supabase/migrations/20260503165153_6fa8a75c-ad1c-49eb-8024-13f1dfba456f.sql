CREATE OR REPLACE FUNCTION public.link_hire_to_current_user()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_hire_id uuid;
BEGIN
  IF v_uid IS NULL OR v_email = '' THEN
    RETURN NULL;
  END IF;

  -- If already linked, return existing
  SELECT id INTO v_hire_id FROM public.onboarding_hires WHERE user_id = v_uid LIMIT 1;
  IF v_hire_id IS NOT NULL THEN
    RETURN v_hire_id;
  END IF;

  UPDATE public.onboarding_hires
  SET user_id = v_uid
  WHERE lower(email) = v_email
    AND user_id IS NULL
  RETURNING id INTO v_hire_id;

  RETURN v_hire_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_hire_to_current_user() TO authenticated;

-- Backfill Jenna (and any other hires whose email matches an existing auth user)
UPDATE public.onboarding_hires h
SET user_id = u.id
FROM auth.users u
WHERE h.user_id IS NULL
  AND lower(h.email) = lower(u.email);
