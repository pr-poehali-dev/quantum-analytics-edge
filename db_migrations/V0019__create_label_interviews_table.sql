CREATE TABLE IF NOT EXISTS label_interviews (
    id SERIAL PRIMARY KEY,
    artist_name VARCHAR(200) NOT NULL,
    artist_photo_url VARCHAR(500),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    excerpt VARCHAR(300),
    sort_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);