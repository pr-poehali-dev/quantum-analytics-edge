CREATE TABLE IF NOT EXISTS t_p40522734_quantum_analytics_ed.label_artists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  url VARCHAR(500),
  photo_url VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
