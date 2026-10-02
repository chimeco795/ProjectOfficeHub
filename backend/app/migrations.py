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


def migrate_master(db, data_dir):
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0] >= 5:
        return
    db.commit()
    if db.execute('SELECT COUNT(*) FROM projects').fetchone()[0]:
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
        with sqlite3.connect(data_dir / f'backup-v4-{stamp}.sqlite3') as backup:
            db.backup(backup)
    db.execute('BEGIN IMMEDIATE')
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0] >= 5:
        return
    statements = [
        '''CREATE TABLE people(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL DEFAULT '',
            email_key TEXT UNIQUE,version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)''',
        '''CREATE TABLE project_people(project_id TEXT NOT NULL REFERENCES projects(id),person_id TEXT NOT NULL REFERENCES people(id),
            PRIMARY KEY(project_id,person_id))''',
        '''CREATE TABLE master_items(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),
            kind TEXT NOT NULL CHECK(kind IN ('Risk','Assumption','Issue','Dependency','Milestone','Activity')),
            code TEXT NOT NULL,code_key TEXT NOT NULL,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Abierto',owner_id TEXT REFERENCES people(id),related_id TEXT REFERENCES master_items(id),
            start_date TEXT,target_date TEXT,probability TEXT NOT NULL DEFAULT '',impact TEXT NOT NULL DEFAULT '',
            response TEXT NOT NULL DEFAULT '',executive_priority TEXT NOT NULL DEFAULT 'Media',
            include_in_report INTEGER NOT NULL DEFAULT 1,progress REAL CHECK(progress BETWEEN 0 AND 100),
            archived INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
            UNIQUE(project_id,code_key))''',
        '''CREATE TABLE weekly_item_snapshots(record_id TEXT PRIMARY KEY REFERENCES records(id),cut_id TEXT NOT NULL REFERENCES cuts(id),
            master_item_id TEXT NOT NULL REFERENCES master_items(id),master_version INTEGER NOT NULL,
            master_snapshot TEXT NOT NULL,payload TEXT NOT NULL,frozen_at TEXT,UNIQUE(cut_id,master_item_id))''',
        '''CREATE TABLE audit_events(id INTEGER PRIMARY KEY,project_id TEXT REFERENCES projects(id),entity_id TEXT NOT NULL,
            changed_at TEXT NOT NULL,event TEXT NOT NULL,previous TEXT NOT NULL,next TEXT NOT NULL)''',
        'CREATE INDEX master_project ON master_items(project_id,kind)',
        'CREATE INDEX audit_project ON audit_events(project_id,changed_at)',
    ]
    for statement in statements:db.execute(statement)
    # Relationships must stay inside a project, even outside the API.
    for action in ('INSERT','UPDATE'):
        db.execute(f'''CREATE TRIGGER master_relations_{action.lower()} BEFORE {action} ON master_items
            WHEN (NEW.owner_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM project_people WHERE project_id=NEW.project_id AND person_id=NEW.owner_id))
              OR (NEW.related_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM master_items WHERE id=NEW.related_id AND project_id=NEW.project_id AND id!=NEW.id))
            BEGIN SELECT RAISE(ABORT,'Relación ajena al proyecto'); END''')
        db.execute(f'''CREATE TRIGGER snapshot_scope_{action.lower()} BEFORE {action} ON weekly_item_snapshots
            WHEN NOT EXISTS(SELECT 1 FROM records r JOIN cuts c ON c.id=r.cut_id JOIN master_items m ON m.project_id=c.project_id
                WHERE r.id=NEW.record_id AND c.id=NEW.cut_id AND m.id=NEW.master_item_id)
            BEGIN SELECT RAISE(ABORT,'Snapshot ajeno al proyecto o corte'); END''')
    for action in ('INSERT','UPDATE','DELETE'):
        checks=[]
        if action!='DELETE':checks.append("EXISTS(SELECT 1 FROM cuts WHERE id=NEW.cut_id AND status='publicado')")
        if action!='INSERT':checks.append("EXISTS(SELECT 1 FROM cuts WHERE id=OLD.cut_id AND status='publicado')")
        db.execute(f'''CREATE TRIGGER published_snapshot_{action.lower()} BEFORE {action} ON weekly_item_snapshots
            WHEN {' OR '.join(checks)} BEGIN SELECT RAISE(ABORT,'Snapshot publicado inmutable'); END''')
        row='OLD' if action=='DELETE' else 'NEW'
        db.execute(f'''CREATE TRIGGER revision_snapshot_{action.lower()} AFTER {action} ON weekly_item_snapshots
            BEGIN UPDATE cuts SET version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id={row}.cut_id; END''')
    db.execute('INSERT INTO schema_version VALUES(5)')
