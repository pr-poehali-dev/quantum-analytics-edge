CREATE TABLE t_p40522734_quantum_analytics_ed.documents (
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