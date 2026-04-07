CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    published_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    is_visible BOOLEAN NOT NULL DEFAULT TRUE
);