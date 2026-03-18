CREATE TABLE t_p40522734_quantum_analytics_ed.statistics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p40522734_quantum_analytics_ed.users(id),
    platform VARCHAR(100) NOT NULL,
    track_title VARCHAR(255) NOT NULL,
    streams BIGINT NOT NULL DEFAULT 0,
    period VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);