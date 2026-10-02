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


def history_points(db, cut_id):
    import json
    cut = db.execute('SELECT * FROM cuts WHERE id=?', (cut_id,)).fetchone()
    rows = db.execute('SELECT id,report_date,status,metadata FROM cuts WHERE project_id=? AND report_date<=? ORDER BY report_date', (cut['project_id'],cut['report_date'])).fetchall()
    return [{'id':r['id'], 'date':r['report_date'], 'status':r['status'],
             'planned':json.loads(r['metadata']).get('planned'),
             'actual':json.loads(r['metadata']).get('actual')} for r in rows]


def migrate_weekly(db, data_dir):
    import json
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0] >= 4:
        return
    db.commit()
    if db.execute('SELECT COUNT(*) FROM projects').fetchone()[0]:
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
        with sqlite3.connect(data_dir / f'backup-v3-{stamp}.sqlite3') as backup:
            db.backup(backup)
    db.execute('BEGIN IMMEDIATE')
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0] >= 4:
        return
    db.execute('ALTER TABLE cuts ADD COLUMN updated_at TEXT')
    db.execute('ALTER TABLE cuts ADD COLUMN history_snapshot TEXT')
    db.execute('UPDATE cuts SET updated_at=COALESCE(published_at,created_at)')
    for cut in db.execute("SELECT id FROM cuts WHERE status='publicado'").fetchall():
        points = [p for p in history_points(db, cut['id']) if p['status']=='publicado']
        db.execute('UPDATE cuts SET history_snapshot=? WHERE id=?', (json.dumps(points,ensure_ascii=False),cut['id']))
    for action in ('UPDATE','DELETE'):
        db.execute(f"""CREATE TRIGGER published_cut_{action.lower()} BEFORE {action} ON cuts
            WHEN OLD.status='publicado' BEGIN SELECT RAISE(ABORT,'Corte publicado inmutable'); END""")
    for table in ('records','sources'):
        for action in ('INSERT','UPDATE','DELETE'):
            checks = []
            if action != 'DELETE':
                checks.append("EXISTS(SELECT 1 FROM cuts WHERE id=NEW.cut_id AND status='publicado')")
            if action != 'INSERT':
                checks.append("EXISTS(SELECT 1 FROM cuts WHERE id=OLD.cut_id AND status='publicado')")
            db.execute(f"""CREATE TRIGGER published_{table}_{action.lower()} BEFORE {action} ON {table}
                WHEN {' OR '.join(checks)} BEGIN SELECT RAISE(ABORT,'Corte publicado inmutable'); END""")
        # Every content mutation invalidates a stale publication/summary version.
        for action in ('INSERT','UPDATE','DELETE'):
            row = 'OLD' if action == 'DELETE' else 'NEW'
            db.execute(f"""CREATE TRIGGER revision_{table}_{action.lower()} AFTER {action} ON {table}
                BEGIN UPDATE cuts SET version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id={row}.cut_id; END""")
    db.execute("""CREATE TRIGGER immutable_source BEFORE UPDATE ON sources
        BEGIN SELECT RAISE(ABORT,'Fuente original inmutable'); END""")
    db.execute("""CREATE TRIGGER immutable_record_cut BEFORE UPDATE OF cut_id ON records
        BEGIN SELECT RAISE(ABORT,'No se puede mover un registro a otro corte'); END""")
    db.execute('INSERT INTO schema_version VALUES(4)')
