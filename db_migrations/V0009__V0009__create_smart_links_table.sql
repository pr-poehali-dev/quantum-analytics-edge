CREATE TABLE t_p40522734_quantum_analytics_ed.smart_links (
    id SERIAL PRIMARY KEY,
    release_id INTEGER NOT NULL REFERENCES t_p40522734_quantum_analytics_ed.releases(id),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    artist_name TEXT,
    cover_url TEXT,
    description TEXT,
    links JSONB NOT NULL DEFAULT '[]',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_smart_links_slug ON t_p40522734_quantum_analytics_ed.smart_links(slug);
CREATE INDEX idx_smart_links_release_id ON t_p40522734_quantum_analytics_ed.smart_links(release_id);