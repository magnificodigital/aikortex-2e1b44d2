CREATE TABLE IF NOT EXISTS agency_rate_limits (
  agency_id     uuid        NOT NULL,
  window_start  timestamptz NOT NULL,
  request_count integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (agency_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_agency_rate_limits_window
  ON agency_rate_limits(window_start);

ALTER TABLE agency_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_agency_id   uuid,
  p_window_start timestamptz,
  p_limit       integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO agency_rate_limits (agency_id, window_start, request_count)
  VALUES (p_agency_id, p_window_start, 1)
  ON CONFLICT (agency_id, window_start)
  DO UPDATE SET request_count = agency_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  DELETE FROM agency_rate_limits
  WHERE window_start < now() - interval '5 minutes';

  RETURN v_count <= p_limit;
END;
$$;