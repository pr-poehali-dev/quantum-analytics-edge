ALTER TABLE t_p40522734_quantum_analytics_ed.distribution_requests
  ADD COLUMN IF NOT EXISTS lyrics text NULL,
  ADD COLUMN IF NOT EXISTS copyright text NULL;

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.royalties (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES t_p40522734_quantum_analytics_ed.users(id),
  period text NOT NULL,
  platform text NOT NULL,
  track_title text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'RUB',
  notes text NULL,
  created_at timestamp DEFAULT now()
);