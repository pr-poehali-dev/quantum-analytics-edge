-- Восстановление всей структуры БД (таблицы были утеряны, кроме label_interviews)

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    artist_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'artist',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.contracts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p40522734_quantum_analytics_ed.users(id),
    title VARCHAR(255) NOT NULL,
    contract_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
    amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    yookassa_payment_id VARCHAR(255),
    payment_url TEXT
);

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.tracks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p40522734_quantum_analytics_ed.users(id),
    title VARCHAR(255) NOT NULL,
    file_url TEXT,
    file_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p40522734_quantum_analytics_ed.users(id),
    sender_role VARCHAR(20) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p40522734_quantum_analytics_ed.users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.statistics (
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

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.site_visits (
    id SERIAL PRIMARY KEY,
    visited_at TIMESTAMP DEFAULT NOW(),
    page VARCHAR(255) DEFAULT '/',
    session_id VARCHAR(64),
    user_agent TEXT
);

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
    updated_at TIMESTAMP DEFAULT NOW(),
    type TEXT NULL,
    label TEXT NULL
);

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.distribution_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p40522734_quantum_analytics_ed.users(id),
    release_id INTEGER,
    platforms TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMP DEFAULT NOW(),
    lyrics text NULL,
    copyright text NULL,
    audio_url text NULL
);

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.royalties (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES t_p40522734_quantum_analytics_ed.users(id),
  period text NOT NULL,
  platform text NOT NULL,
  track_title text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'RUB',
  notes text NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.radio_likes (
    id SERIAL PRIMARY KEY,
    artist_name VARCHAR(100) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    liked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(artist_name, session_id)
);

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p40522734_quantum_analytics_ed.users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  uploaded_by INTEGER NOT NULL REFERENCES t_p40522734_quantum_analytics_ed.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.smart_links (
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

CREATE INDEX IF NOT EXISTS idx_smart_links_slug ON t_p40522734_quantum_analytics_ed.smart_links(slug);
CREATE INDEX IF NOT EXISTS idx_smart_links_release_id ON t_p40522734_quantum_analytics_ed.smart_links(release_id);

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
    created_at TIMESTAMP DEFAULT NOW(),
    uploader_token text NULL
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

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.label_artists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  url VARCHAR(500),
  photo_url VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  instagram_url VARCHAR(512),
  vk_url VARCHAR(512)
);

INSERT INTO t_p40522734_quantum_analytics_ed.label_artists (name, url, photo_url, sort_order) VALUES
  ('TomLuv', 'https://music.yandex.ru/artist/17970337', 'https://cdn.poehali.dev/projects/49f0dfee-d362-48aa-ab1c-67bc8f7671ea/bucket/8eb66602-d35a-4118-852d-3f6329c87dd0.jpg', 1),
  ('Нэтшанэт', 'https://music.yandex.ru/artist/24577979', 'https://cdn.poehali.dev/projects/49f0dfee-d362-48aa-ab1c-67bc8f7671ea/bucket/f7d19650-b5a0-4229-b27e-b9b1977b886b.jpeg', 2),
  ('VOINOVA', 'https://music.yandex.ru/artist/11202759', 'https://cdn.poehali.dev/projects/49f0dfee-d362-48aa-ab1c-67bc8f7671ea/bucket/9dc47e96-639b-4711-a409-7306d6eeb1c0.jpeg', 3),
  ('808 FAY', 'https://music.yandex.ru/artist/25131782', 'https://cdn.poehali.dev/projects/49f0dfee-d362-48aa-ab1c-67bc8f7671ea/bucket/4866b3a1-ab4b-4b78-961e-852b475a16a0.jpeg', 4),
  ('DIMUSIK', 'https://music.yandex.ru/artist/16745184', NULL, 5),
  ('Макс Чуев', 'https://music.yandex.ru/artist/25536549', NULL, 6),
  ('Lill Kiska', 'https://music.yandex.ru/artist/23291999', 'https://cdn.poehali.dev/projects/49f0dfee-d362-48aa-ab1c-67bc8f7671ea/bucket/d7f84708-bd5b-4310-8b00-9ee8452deca9.jpg', 7),
  ('TBOU DRUG', 'https://music.yandex.ru/artist/25067872', 'https://cdn.poehali.dev/projects/49f0dfee-d362-48aa-ab1c-67bc8f7671ea/bucket/97f6f7d3-468a-43d2-84ea-fddb2d4afded.jpeg', 8),
  ('StasFox', 'https://music.yandex.ru/artist/24519124', 'https://cdn.poehali.dev/projects/49f0dfee-d362-48aa-ab1c-67bc8f7671ea/bucket/43dcb379-258a-46fb-a18a-570a29543ec4.jpg', 9),
  ('MAMATANK', 'https://music.yandex.ru/artist/22126498', 'https://cdn.poehali.dev/projects/49f0dfee-d362-48aa-ab1c-67bc8f7671ea/bucket/ed623afb-ba3d-47ac-98c3-1ad96dfa6f79.jpeg', 10)
ON CONFLICT DO NOTHING;

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

ALTER TABLE t_p40522734_quantum_analytics_ed.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    published_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    is_visible BOOLEAN NOT NULL DEFAULT TRUE
);
