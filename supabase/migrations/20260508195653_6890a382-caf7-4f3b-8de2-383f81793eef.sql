
-- 1. Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'photographer';

-- 2. Photographers <-> auth user link
ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE;

-- 3. Gear requests linkage
ALTER TABLE public.gear_requests
  ADD COLUMN IF NOT EXISTS photographer_id uuid,
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS gear_requests_user_id_idx ON public.gear_requests(user_id);
CREATE INDEX IF NOT EXISTS gear_requests_photographer_id_idx ON public.gear_requests(photographer_id);

-- Allow photographers to read their own gear requests
CREATE POLICY "photographers read own gear_requests"
ON public.gear_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "photographers read own gear_request_items"
ON public.gear_request_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.gear_requests r
  WHERE r.id = gear_request_items.request_id AND r.user_id = auth.uid()
));

-- Photographers can cancel their own pending requests
CREATE POLICY "photographers update own pending gear_requests"
ON public.gear_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid());

-- 4. Landing photos
CREATE TABLE public.landing_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  alt_text text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.landing_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads landing_photos"
ON public.landing_photos FOR SELECT USING (true);

CREATE POLICY "admins manage landing_photos"
ON public.landing_photos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Events
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  capacity int,
  cover_image_url text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read published events"
ON public.events FOR SELECT TO authenticated
USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage events"
ON public.events FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Event RSVPs
CREATE TYPE public.rsvp_status AS ENUM ('going', 'maybe', 'declined');

CREATE TABLE public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  photographer_id uuid REFERENCES public.photographers(id) ON DELETE SET NULL,
  status public.rsvp_status NOT NULL DEFAULT 'going',
  responded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own rsvps"
ON public.event_rsvps FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user inserts own rsvps"
ON public.event_rsvps FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user updates own rsvps"
ON public.event_rsvps FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user deletes own rsvps"
ON public.event_rsvps FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Admins can also see all RSVPs (already covered by SELECT policy)

-- 7. Training videos
CREATE TABLE public.training_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  category text,
  sort_order int NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read published videos"
ON public.training_videos FOR SELECT TO authenticated
USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage videos"
ON public.training_videos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT true,
  author_id uuid,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read published announcements"
ON public.announcements FOR SELECT TO authenticated
USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage announcements"
ON public.announcements FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. Generic touch trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_events_touch BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_videos_touch BEFORE UPDATE ON public.training_videos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_anns_touch BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 10. Link photographer to current user (mirror of link_hire_to_current_user)
CREATE OR REPLACE FUNCTION public.link_photographer_to_current_user()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_photographer_id uuid;
BEGIN
  IF v_uid IS NULL OR v_email = '' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_photographer_id
  FROM public.photographers
  WHERE user_id = v_uid
  LIMIT 1;

  IF v_photographer_id IS NULL THEN
    SELECT id INTO v_photographer_id
    FROM public.photographers
    WHERE lower(email) = v_email AND user_id IS NULL AND active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_photographer_id IS NOT NULL THEN
      UPDATE public.photographers SET user_id = v_uid WHERE id = v_photographer_id;
    END IF;
  END IF;

  IF v_photographer_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'photographer'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_photographer_id;
END;
$$;

-- 11. Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('landing-photos', 'landing-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('training-videos', 'training-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Landing photos: public read, admin write
CREATE POLICY "public read landing-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-photos');

CREATE POLICY "admins write landing-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'landing-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update landing-photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'landing-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete landing-photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'landing-photos' AND public.has_role(auth.uid(), 'admin'));

-- Training videos: signed-in read, admin write
CREATE POLICY "authenticated read training-videos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'training-videos');

CREATE POLICY "admins write training-videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'training-videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update training-videos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'training-videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete training-videos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'training-videos' AND public.has_role(auth.uid(), 'admin'));
