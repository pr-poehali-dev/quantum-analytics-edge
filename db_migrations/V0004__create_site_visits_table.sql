CREATE TABLE t_p40522734_quantum_analytics_ed.site_visits (
    id SERIAL PRIMARY KEY,
    visited_at TIMESTAMP DEFAULT NOW(),
    page VARCHAR(255) DEFAULT '/',
    session_id VARCHAR(64),
    user_agent TEXT
);