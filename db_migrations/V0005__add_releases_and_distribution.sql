CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.releases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p40522734_quantum_analytics_ed.users(id),
    title TEXT NOT NULL,
    artist_name TEXT,
    upc TEXT,
    cover_url TEXT,
    status TEXT NOT NULL DEFAULT 'moderation',
    genre TEXT,
    release_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.distribution_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p40522734_quantum_analytics_ed.users(id),
    release_id INTEGER,
    platforms TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMP DEFAULT NOW()
);
