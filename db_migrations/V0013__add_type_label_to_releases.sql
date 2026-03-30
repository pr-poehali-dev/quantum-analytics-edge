ALTER TABLE t_p40522734_quantum_analytics_ed.releases
  ADD COLUMN IF NOT EXISTS type text NULL,
  ADD COLUMN IF NOT EXISTS label text NULL;