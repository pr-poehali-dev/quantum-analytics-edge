CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.radio_likes (
    id SERIAL PRIMARY KEY,
    artist_name VARCHAR(100) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    liked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(artist_name, session_id)
);