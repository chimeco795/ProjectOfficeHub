"""Additive migrations for the unified product. Run inside db.initialize()."""
import sqlite3
from datetime import datetime, timezone


def migrate_projects(db, data_dir):
    version = db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]
    if version >= 3:
        return
    # Commit earlier migrations before creating a consistent SQLite backup.
    db.commit()
    if db.execute('SELECT COUNT(*) FROM projects').fetchone()[0]:
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
        with sqlite3.connect(data_dir / f'backup-v2-{stamp}.sqlite3') as backup:
            db.backup(backup)
    db.execute('BEGIN IMMEDIATE')
    # Another process may have finished while this connection awaited the lock.
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0] >= 3:
        return
    db.execute("ALTER TABLE projects ADD COLUMN methodology TEXT NOT NULL DEFAULT 'Hybrid' CHECK(methodology IN ('Agile','Waterfall','Hybrid'))")
    db.execute("ALTER TABLE projects ADD COLUMN priority TEXT NOT NULL DEFAULT 'Media' CHECK(priority IN ('Baja','Media','Alta','Crítica'))")
    db.execute('ALTER TABLE projects ADD COLUMN target_date TEXT')
    db.execute('ALTER TABLE projects ADD COLUMN updated_at TEXT')
    db.execute('UPDATE projects SET updated_at=created_at')
    db.execute('INSERT INTO schema_version VALUES(3)')
