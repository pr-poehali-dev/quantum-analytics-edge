
CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.beats (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    genre VARCHAR(100),
    bpm INTEGER,
    price NUMERIC(10,2),
    currency VARCHAR(10) DEFAULT 'RUB',
    contact_telegram VARCHAR(255),
    contact_email VARCHAR(255),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    cover_url TEXT,
    description TEXT,
    tags VARCHAR(500),
    plays INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.label_releases (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist_name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_url TEXT,
    audio_url TEXT,
    external_link TEXT,
    genre VARCHAR(100),
    release_date DATE,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
