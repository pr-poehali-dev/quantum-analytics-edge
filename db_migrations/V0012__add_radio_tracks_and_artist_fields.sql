CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.radio_tracks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size BIGINT DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Добавить поле is_active и sort_order в label_artists если нет
ALTER TABLE t_p40522734_quantum_analytics_ed.label_artists 
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(512),
    ADD COLUMN IF NOT EXISTS vk_url VARCHAR(512);
