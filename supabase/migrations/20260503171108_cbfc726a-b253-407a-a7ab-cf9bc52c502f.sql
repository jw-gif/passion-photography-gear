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

  SELECT id INTO v_hire_id
  FROM public.onboarding_hires
  WHERE user_id = v_uid
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_hire_id IS NULL THEN
    -- Pick the most recently created unlinked hire row matching this email.
    -- Using a subquery + LIMIT avoids "more than one row returned" errors
    -- when an email was used for multiple hire records.
    SELECT id INTO v_hire_id
    FROM public.onboarding_hires
    WHERE lower(email) = v_email
      AND user_id IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_hire_id IS NOT NULL THEN
      UPDATE public.onboarding_hires
      SET user_id = v_uid
      WHERE id = v_hire_id;
    END IF;
  END IF;

  IF v_hire_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_uid, 'team'::public.app_role)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN v_hire_id;
END;
$$;