-- Vendor suggestions (new vendor proposals and edit suggestions)

CREATE TABLE suggestions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('new_vendor', 'edit_vendor')),
  vendor_id TEXT REFERENCES vendors(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggested_data TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_suggestions_status ON suggestions(status);
CREATE INDEX idx_suggestions_user ON suggestions(user_id);
CREATE INDEX idx_suggestions_vendor ON suggestions(vendor_id);
