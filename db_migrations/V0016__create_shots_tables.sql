CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.shots (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.shot_likes (
  id SERIAL PRIMARY KEY,
  shot_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shot_id, user_id)
);

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.shot_comments (
  id SERIAL PRIMARY KEY,
  shot_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);