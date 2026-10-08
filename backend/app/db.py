import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from contextlib import contextmanager

DATA = Path(os.environ.get('PMO_DATA_DIR', Path(__file__).resolve().parents[2] / 'data'))

def encode(value):
    return json.dumps(value, ensure_ascii=False, default=str)

@contextmanager
def connection():
    DATA.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DATA / 'pmo.sqlite3', timeout=15)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    try:
        with db:
            yield db
    finally:
        db.close()

def initialize():
    with connection() as db:
        db.executescript('''
        CREATE TABLE IF NOT EXISTS schema_version(version INTEGER PRIMARY KEY);
        INSERT OR IGNORE INTO schema_version VALUES (1);
        CREATE TABLE IF NOT EXISTS projects(
          id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
          objective TEXT NOT NULL, start_date TEXT, go_live TEXT, close_date TEXT,
          status TEXT NOT NULL DEFAULT 'Activo', created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS cuts(
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
          report_date TEXT NOT NULL, start_date TEXT, end_date TEXT,
          created_at TEXT NOT NULL, UNIQUE(project_id, report_date));
        CREATE TABLE IF NOT EXISTS sources(
          id TEXT PRIMARY KEY, cut_id TEXT NOT NULL REFERENCES cuts(id),
          filename TEXT NOT NULL, kind TEXT NOT NULL, sha256 TEXT NOT NULL,
          uploaded_at TEXT NOT NULL, original_file BLOB NOT NULL,
          mapping TEXT NOT NULL, warnings TEXT NOT NULL,
          UNIQUE(cut_id, sha256));
        CREATE TABLE IF NOT EXISTS records(
          id TEXT PRIMARY KEY, cut_id TEXT NOT NULL REFERENCES cuts(id),
          source_id TEXT REFERENCES sources(id), section TEXT NOT NULL,
          location TEXT NOT NULL, original TEXT NOT NULL, current TEXT NOT NULL,
          generated TEXT NOT NULL DEFAULT '{}', review TEXT NOT NULL DEFAULT 'pendiente',
          modified INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS audit(
          id INTEGER PRIMARY KEY, record_id TEXT NOT NULL REFERENCES records(id),
          changed_at TEXT NOT NULL, previous TEXT NOT NULL, next TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS records_cut ON records(cut_id);
        CREATE TRIGGER IF NOT EXISTS immutable_original BEFORE UPDATE OF original,source_id,location ON records
          BEGIN SELECT RAISE(ABORT, 'Original inmutable'); END;
        ''')
        version = db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]
        if version < 2:
            # Back up an existing populated database before the additive migration.
            if db.execute('SELECT COUNT(*) FROM projects').fetchone()[0]:
                stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
                with sqlite3.connect(DATA / f'backup-v1-{stamp}.sqlite3') as backup:
                    db.backup(backup)
            db.execute('BEGIN IMMEDIATE')
            db.execute("ALTER TABLE projects ADD COLUMN version INTEGER NOT NULL DEFAULT 1")
            db.execute("ALTER TABLE cuts ADD COLUMN status TEXT NOT NULL DEFAULT 'borrador'")
            db.execute("ALTER TABLE cuts ADD COLUMN version INTEGER NOT NULL DEFAULT 1")
            db.execute("ALTER TABLE cuts ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}'")
            db.execute("ALTER TABLE cuts ADD COLUMN project_snapshot TEXT NOT NULL DEFAULT '{}'")
            db.execute("ALTER TABLE cuts ADD COLUMN published_at TEXT")
            db.execute("ALTER TABLE records ADD COLUMN parent_record_id TEXT REFERENCES records(id)")
            db.execute('CREATE TABLE cut_audit(id INTEGER PRIMARY KEY, cut_id TEXT NOT NULL REFERENCES cuts(id), changed_at TEXT NOT NULL, event TEXT NOT NULL, previous TEXT NOT NULL, next TEXT NOT NULL)')
            db.execute('CREATE TABLE project_audit(id INTEGER PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), changed_at TEXT NOT NULL, previous TEXT NOT NULL, next TEXT NOT NULL)')
            db.execute('INSERT INTO schema_version VALUES(2)')
        from .migrations import migrate_projects, migrate_weekly, migrate_master, migrate_pmo, migrate_organization, migrate_operation_details, migrate_executive_links, migrate_management, migrate_minutes
        migrate_projects(db, DATA)
        migrate_weekly(db, DATA)
        migrate_master(db, DATA)

        migrate_pmo(db, DATA)
        migrate_organization(db, DATA)

        migrate_operation_details(db, DATA)
        migrate_executive_links(db, DATA)
        migrate_management(db, DATA)
        migrate_minutes(db, DATA)
