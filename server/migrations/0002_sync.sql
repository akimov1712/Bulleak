-- Sync of progress, settings and records between devices (docs/04-features/accounts-backend.md, sections 5 and 7).

-- Per-user counter of record changes: every change gets the next value, clients pull "since".
ALTER TABLE users ADD COLUMN record_rev bigint NOT NULL DEFAULT 0;

-- One progress document per user; `rev` grows on every write (optimistic concurrency).
CREATE TABLE progress (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  state jsonb NOT NULL,
  schema_version integer NOT NULL,
  rev bigint NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Settings: last write wins.
CREATE TABLE settings (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  state jsonb NOT NULL,
  rev bigint NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Simulator trades and journal entries: one row per record, deletions kept as tombstones.
CREATE TABLE sync_records (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('sim', 'journal')),
  uid uuid NOT NULL,
  data jsonb,
  -- Client time of the change: the newer change of the same record wins.
  changed_at bigint NOT NULL,
  rev bigint NOT NULL,
  deleted boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, kind, uid)
);
CREATE INDEX sync_records_cursor_idx ON sync_records (user_id, kind, rev);
