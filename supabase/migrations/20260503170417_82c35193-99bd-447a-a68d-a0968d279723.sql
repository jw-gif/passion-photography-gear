CREATE OR REPLACE FUNCTION public.link_hire_to_current_user()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_hire_id uuid;
BEGIN
  IF v_uid IS NULL OR v_email = '' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_hire_id FROM public.onboarding_hires WHERE user_id = v_uid LIMIT 1;

  IF v_hire_id IS NULL THEN
    UPDATE public.onboarding_hires
    SET user_id = v_uid
    WHERE lower(email) = v_email
      AND user_id IS NULL
    RETURNING id INTO v_hire_id;
  END IF;

  -- If linked (now or previously), ensure they have at least the 'team' role
  -- so they appear in the Team admin panel. Don't add 'team' if they already
  -- have any role (e.g. admin).
  IF v_hire_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_uid, 'team'::public.app_role)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN v_hire_id;
END;
$function$;

-- Backfill: any already-linked hire without a role gets 'team'.
INSERT INTO public.user_roles (user_id, role)
SELECT h.user_id, 'team'::public.app_role
FROM public.onboarding_hires h
WHERE h.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = h.user_id
  )
ON CONFLICT DO NOTHING;