-- Speaker tracking: speakers as child entities of vendors
-- with independent rating and notes systems

CREATE TABLE speakers (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  bio TEXT,
  website TEXT,
  linkedin TEXT,
  topics TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE speaker_ratings (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  speaker_id TEXT NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('up', 'down', 'neutral')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, speaker_id)
);

CREATE TABLE speaker_notes (
  id TEXT PRIMARY KEY,
  speaker_id TEXT NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_speakers_vendor ON speakers(vendor_id);
CREATE INDEX idx_speakers_active ON speakers(vendor_id, active);
CREATE INDEX idx_speaker_ratings_speaker ON speaker_ratings(speaker_id);
CREATE INDEX idx_speaker_notes_speaker ON speaker_notes(speaker_id);
