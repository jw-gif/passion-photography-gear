-- Enable pg_cron for scheduled auto-archive
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function: roll past photo requests forward
CREATE OR REPLACE FUNCTION public.auto_archive_past_photo_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Approved-ish + scheduled past events → completed
  UPDATE public.photo_requests
  SET status = 'completed'::photo_request_status,
      updated_at = now()
  WHERE status IN (
          'approved_job_board'::photo_request_status,
          'approved_shot_list'::photo_request_status,
          'scheduled'::photo_request_status
        )
    AND event_date IS NOT NULL
    AND COALESCE(event_end_date, event_date) < CURRENT_DATE;

  -- Denied / declined past events → archived
  UPDATE public.photo_requests
  SET status = 'archived'::photo_request_status,
      updated_at = now()
  WHERE status IN (
          'denied'::photo_request_status,
          'declined'::photo_request_status
        )
    AND event_date IS NOT NULL
    AND COALESCE(event_end_date, event_date) < CURRENT_DATE;
END;
$$;

-- Run once immediately to catch existing past requests
SELECT public.auto_archive_past_photo_requests();

-- Schedule daily at 03:00 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('auto-archive-past-photo-requests');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'auto-archive-past-photo-requests',
  '0 3 * * *',
  $$SELECT public.auto_archive_past_photo_requests();$$
);