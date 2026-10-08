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


def migrate_pmo(db, data_dir):
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0] >= 6:
        return
    db.commit()
    if db.execute('SELECT COUNT(*) FROM projects').fetchone()[0]:
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
        with sqlite3.connect(data_dir / f'backup-v5-{stamp}.sqlite3') as backup:
            db.backup(backup)
    db.execute('BEGIN IMMEDIATE')
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0] >= 6:
        return
    db.execute('''CREATE TABLE planning_periods(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),
        kind TEXT NOT NULL CHECK(kind IN ('Iteration','Release')),name TEXT NOT NULL,start_date TEXT,end_date TEXT,
        status TEXT NOT NULL DEFAULT 'Planned',description TEXT NOT NULL DEFAULT '',archived INTEGER NOT NULL DEFAULT 0,
        version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)''')
    for column in ["work_type TEXT NOT NULL DEFAULT 'Activity'", 'parent_id TEXT REFERENCES master_items(id)',
        'original_effort REAL CHECK(original_effort>=0)', 'remaining_effort REAL CHECK(remaining_effort>=0)',
        'completed_effort REAL CHECK(completed_effort>=0)', 'points REAL CHECK(points>=0)',
        'iteration_id TEXT REFERENCES planning_periods(id)', 'release_id TEXT REFERENCES planning_periods(id)']:
        db.execute('ALTER TABLE master_items ADD COLUMN '+column)
    db.execute('''CREATE TABLE work_dependencies(item_id TEXT NOT NULL REFERENCES master_items(id),
        predecessor_id TEXT NOT NULL REFERENCES master_items(id),PRIMARY KEY(item_id,predecessor_id),CHECK(item_id!=predecessor_id))''')
    db.execute('''CREATE TABLE teams(id TEXT PRIMARY KEY,name TEXT NOT NULL,lead_id TEXT REFERENCES people(id),
        archived INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1)''')
    db.execute('CREATE TABLE project_teams(project_id TEXT NOT NULL REFERENCES projects(id),team_id TEXT NOT NULL REFERENCES teams(id),PRIMARY KEY(project_id,team_id))')
    db.execute('''CREATE TABLE memberships(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),
        team_id TEXT REFERENCES teams(id),person_id TEXT NOT NULL REFERENCES people(id),role TEXT NOT NULL,
        allocation REAL NOT NULL CHECK(allocation BETWEEN 0 AND 100),valid_from TEXT,valid_to TEXT,
        archived INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1)''')
    db.execute('''CREATE TABLE budgets(project_id TEXT PRIMARY KEY REFERENCES projects(id),currency TEXT NOT NULL,
        approved_cents INTEGER NOT NULL CHECK(approved_cents>=0),contingency_cents INTEGER NOT NULL CHECK(contingency_cents>=0),
        notes TEXT NOT NULL DEFAULT '',version INTEGER NOT NULL DEFAULT 1)''')
    db.execute('''CREATE TABLE budget_entries(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),
        concept TEXT NOT NULL,category TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('Planned','Committed','Actual','Forecast')),
        amount_cents INTEGER NOT NULL CHECK(amount_cents>=0),currency TEXT NOT NULL,date TEXT,related_id TEXT REFERENCES master_items(id),
        vendor TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',archived INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1)''')
    db.execute('''CREATE TABLE events(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),title TEXT NOT NULL,
        date TEXT NOT NULL,time TEXT NOT NULL,kind TEXT NOT NULL,owner_id TEXT REFERENCES people(id),description TEXT NOT NULL DEFAULT '',
        guests TEXT NOT NULL DEFAULT '[]',archived INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1)''')
    db.execute('''CREATE TABLE documents(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),filename TEXT NOT NULL,
        size INTEGER NOT NULL,sha256 TEXT NOT NULL,content BLOB NOT NULL,related_id TEXT REFERENCES master_items(id),
        notes TEXT NOT NULL DEFAULT '',archived INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL)''')
    db.execute('''CREATE TABLE migration_batches(id TEXT PRIMARY KEY,sha256 TEXT NOT NULL UNIQUE,filename TEXT NOT NULL,
        original BLOB NOT NULL,report TEXT NOT NULL,created_at TEXT NOT NULL)''')
    db.execute('''CREATE TABLE migration_identities(batch_id TEXT NOT NULL REFERENCES migration_batches(id),entity_type TEXT NOT NULL,
        old_id TEXT NOT NULL,new_id TEXT NOT NULL,source TEXT NOT NULL,PRIMARY KEY(batch_id,entity_type,old_id),UNIQUE(source,entity_type,old_id))''')
    for action in ('INSERT','UPDATE'):
        db.execute(f'''CREATE TRIGGER planning_scope_{action.lower()} BEFORE {action} ON master_items
            WHEN (NEW.parent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM master_items p WHERE p.id=NEW.parent_id AND p.project_id=NEW.project_id AND p.kind='Activity' AND NEW.kind='Activity' AND p.id!=NEW.id))
              OR (NEW.iteration_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM planning_periods p WHERE p.id=NEW.iteration_id AND p.project_id=NEW.project_id AND p.kind='Iteration'))
              OR (NEW.release_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM planning_periods p WHERE p.id=NEW.release_id AND p.project_id=NEW.project_id AND p.kind='Release'))
            BEGIN SELECT RAISE(ABORT,'Planificación ajena al proyecto'); END''')
        db.execute(f'''CREATE TRIGGER dependency_scope_{action.lower()} BEFORE {action} ON work_dependencies
            WHEN NOT EXISTS(SELECT 1 FROM master_items a JOIN master_items b ON a.project_id=b.project_id
                WHERE a.id=NEW.item_id AND b.id=NEW.predecessor_id AND a.kind='Activity' AND b.kind='Activity')
            BEGIN SELECT RAISE(ABORT,'Dependencia ajena al proyecto'); END''')
    db.execute('INSERT INTO schema_version VALUES(6)')

def migrate_organization(db,data_dir):
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]>=7:return
    db.commit()
    if db.execute('SELECT COUNT(*) FROM projects').fetchone()[0]:
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
        with sqlite3.connect(data_dir/f'backup-v6-{stamp}.sqlite3') as backup:db.backup(backup)
    db.execute('BEGIN IMMEDIATE')
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]>=7:return
    db.execute('ALTER TABLE people ADD COLUMN leader_id TEXT REFERENCES people(id)')
    db.execute("ALTER TABLE people ADD COLUMN role TEXT NOT NULL DEFAULT ''")
    for action in ('INSERT','UPDATE'):
        db.execute(f'''CREATE TRIGGER organization_cycle_{action.lower()} BEFORE {action} ON people
            WHEN NEW.leader_id IS NOT NULL AND EXISTS(
                WITH RECURSIVE chain(id) AS (SELECT NEW.leader_id UNION SELECT p.leader_id FROM people p JOIN chain c ON p.id=c.id WHERE p.leader_id IS NOT NULL)
                SELECT 1 FROM chain WHERE id=NEW.id)
            BEGIN SELECT RAISE(ABORT,'El organigrama no admite ciclos'); END''')
    db.execute('INSERT INTO schema_version VALUES(7)')


def migrate_operation_details(db,data_dir):
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]>=8:return
    db.commit()
    if db.execute('SELECT COUNT(*) FROM projects').fetchone()[0]:
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
        with sqlite3.connect(data_dir/f'backup-v7-{stamp}.sqlite3') as backup:db.backup(backup)
    db.execute('BEGIN IMMEDIATE')
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]>=8:return
    for column in ['duration_minutes INTEGER CHECK(duration_minutes BETWEEN 1 AND 10080)', 'related_id TEXT REFERENCES master_items(id)', "status TEXT NOT NULL DEFAULT 'Programado'", "notes TEXT NOT NULL DEFAULT ''", "document_ids TEXT NOT NULL DEFAULT '[]'"]:
        db.execute('ALTER TABLE events ADD COLUMN '+column)
    db.execute('ALTER TABLE documents ADD COLUMN author_id TEXT REFERENCES people(id)')
    db.execute('ALTER TABLE documents ADD COLUMN source_id TEXT REFERENCES sources(id)')
    for action in ('INSERT','UPDATE'):
        db.execute(f'''CREATE TRIGGER event_detail_scope_{action.lower()} BEFORE {action} ON events
            WHEN NEW.related_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM master_items WHERE id=NEW.related_id AND project_id=NEW.project_id)
            BEGIN SELECT RAISE(ABORT,'Evento relacionado ajeno al proyecto'); END''')
        db.execute(f'''CREATE TRIGGER document_source_scope_{action.lower()} BEFORE {action} ON documents
            WHEN NEW.source_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM sources s JOIN cuts c ON c.id=s.cut_id WHERE s.id=NEW.source_id AND c.project_id=NEW.project_id)
            BEGIN SELECT RAISE(ABORT,'Fuente ajena al proyecto'); END''')
    db.execute('INSERT INTO schema_version VALUES(8)')

def migrate_executive_links(db,data_dir):
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]!=8:return
    db.commit()
    if db.execute('SELECT COUNT(*) FROM projects').fetchone()[0]:
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
        with sqlite3.connect(data_dir/f'backup-v8-{stamp}.sqlite3') as backup:db.backup(backup)
    db.execute('BEGIN IMMEDIATE')
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]>=9:return
    db.execute('ALTER TABLE events ADD COLUMN propose_executive INTEGER NOT NULL DEFAULT 0 CHECK(propose_executive IN (0,1))')
    for action in ('INSERT','UPDATE'):
        db.execute(f'''CREATE TRIGGER executive_event_link_{action.lower()} BEFORE {action} ON events
            WHEN NEW.propose_executive=1 AND NEW.related_id IS NULL
            BEGIN SELECT RAISE(ABORT,'Propuesta ejecutiva requiere relación'); END''')
    db.execute('INSERT INTO schema_version VALUES(9)')

def migrate_management(db,data_dir):
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]!=9:return
    db.commit()
    if db.execute('SELECT COUNT(*) FROM projects').fetchone()[0]:
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
        with sqlite3.connect(data_dir/f'backup-v9-{stamp}.sqlite3') as backup:db.backup(backup)
    db.execute('BEGIN IMMEDIATE')
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]>=10:return
    for column in ["phone TEXT NOT NULL DEFAULT ''","mobile TEXT NOT NULL DEFAULT ''","location TEXT NOT NULL DEFAULT ''","contact_notes TEXT NOT NULL DEFAULT ''"]:
        db.execute('ALTER TABLE people ADD COLUMN '+column)
    db.execute('''CREATE TABLE roles(id TEXT PRIMARY KEY,name TEXT NOT NULL,name_key TEXT NOT NULL UNIQUE,
        reports_to TEXT REFERENCES roles(id),archived INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1)''')
    db.execute('ALTER TABLE memberships ADD COLUMN role_id TEXT REFERENCES roles(id)')
    db.execute('ALTER TABLE memberships ADD COLUMN leader_id TEXT REFERENCES people(id)')
    db.execute('ALTER TABLE memberships ADD COLUMN allow_multiple_teams INTEGER NOT NULL DEFAULT 0')
    db.execute('''CREATE TABLE availability(id TEXT PRIMARY KEY,person_id TEXT NOT NULL REFERENCES people(id),
        kind TEXT NOT NULL,start_date TEXT NOT NULL,end_date TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '',
        archived INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1,CHECK(start_date<=end_date))''')
    db.execute('''CREATE TABLE working_calendars(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),
        team_id TEXT REFERENCES teams(id),days TEXT NOT NULL,start_time TEXT NOT NULL,end_time TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,CHECK(start_time<end_time))''')
    db.execute("CREATE UNIQUE INDEX calendar_scope ON working_calendars(project_id,COALESCE(team_id,''))")
    db.execute('''CREATE TABLE document_links(document_id TEXT NOT NULL REFERENCES documents(id),
        target_kind TEXT NOT NULL,target_id TEXT NOT NULL,PRIMARY KEY(document_id,target_kind,target_id))''')
    for action in ('INSERT','UPDATE'):
        db.execute(f'''CREATE TRIGGER role_cycle_{action.lower()} BEFORE {action} ON roles
            WHEN NEW.reports_to IS NOT NULL AND EXISTS(WITH RECURSIVE chain(id) AS
                (SELECT NEW.reports_to UNION SELECT r.reports_to FROM roles r JOIN chain c ON r.id=c.id WHERE r.reports_to IS NOT NULL)
                SELECT 1 FROM chain WHERE id=NEW.id)
            BEGIN SELECT RAISE(ABORT,'Los roles no admiten ciclos'); END''')
        db.execute(f'''CREATE TRIGGER document_link_scope_{action.lower()} BEFORE {action} ON document_links
            WHEN NOT EXISTS(SELECT 1 FROM documents d WHERE d.id=NEW.document_id AND (
                (NEW.target_kind='item' AND EXISTS(SELECT 1 FROM master_items t WHERE t.id=NEW.target_id AND t.project_id=d.project_id)) OR
                (NEW.target_kind='event' AND EXISTS(SELECT 1 FROM events t WHERE t.id=NEW.target_id AND t.project_id=d.project_id)) OR
                (NEW.target_kind='cut' AND EXISTS(SELECT 1 FROM cuts t WHERE t.id=NEW.target_id AND t.project_id=d.project_id))))
            BEGIN SELECT RAISE(ABORT,'Documento relacionado ajeno al proyecto'); END''')
    db.execute('INSERT INTO schema_version VALUES(10)')

def migrate_minutes(db,data_dir):
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]!=10:return
    db.commit()
    if db.execute('SELECT COUNT(*) FROM projects').fetchone()[0]:
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
        with sqlite3.connect(data_dir/f'backup-v10-{stamp}.sqlite3') as backup:db.backup(backup)
    db.execute('BEGIN IMMEDIATE')
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]>=11:return
    db.execute('''CREATE TABLE meeting_minutes(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),
        event_id TEXT NOT NULL REFERENCES events(id),document_id TEXT NOT NULL REFERENCES documents(id),
        meeting_date TEXT NOT NULL,participants TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(event_id,document_id))''')
    db.execute('''CREATE TABLE minute_proposals(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),
        minute_id TEXT NOT NULL REFERENCES meeting_minutes(id),kind TEXT NOT NULL,text TEXT NOT NULL,evidence TEXT NOT NULL DEFAULT '',
        owner_id TEXT REFERENCES people(id),target_date TEXT,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','ignored')),
        review_action TEXT,item_id TEXT REFERENCES master_items(id),decision_id TEXT REFERENCES meeting_decisions(id),
        executive_candidate INTEGER NOT NULL DEFAULT 0,reviewer_id TEXT REFERENCES people(id),reviewed_at TEXT,
        version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL)''')
    db.execute('''CREATE TABLE meeting_decisions(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),
        proposal_id TEXT NOT NULL UNIQUE REFERENCES minute_proposals(id),text TEXT NOT NULL,owner_id TEXT REFERENCES people(id),
        target_date TEXT,created_at TEXT NOT NULL)''')
    for action in ('INSERT','UPDATE'):
        db.execute(f'''CREATE TRIGGER minute_scope_{action.lower()} BEFORE {action} ON meeting_minutes
            WHEN NOT EXISTS(SELECT 1 FROM events e JOIN documents d ON d.project_id=e.project_id
                WHERE e.id=NEW.event_id AND d.id=NEW.document_id AND e.project_id=NEW.project_id)
            BEGIN SELECT RAISE(ABORT,'Minuta ajena al proyecto'); END''')
        db.execute(f'''CREATE TRIGGER proposal_scope_{action.lower()} BEFORE {action} ON minute_proposals
            WHEN NOT EXISTS(SELECT 1 FROM meeting_minutes m WHERE m.id=NEW.minute_id AND m.project_id=NEW.project_id)
              OR (NEW.item_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM master_items i WHERE i.id=NEW.item_id AND i.project_id=NEW.project_id))
              OR (NEW.owner_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM project_people p WHERE p.person_id=NEW.owner_id AND p.project_id=NEW.project_id))
            BEGIN SELECT RAISE(ABORT,'Propuesta ajena al proyecto'); END''')
    db.execute('''CREATE TRIGGER immutable_minute BEFORE UPDATE ON meeting_minutes
        BEGIN SELECT RAISE(ABORT,'El contexto original de la minuta es inmutable'); END''')
    db.execute('INSERT INTO schema_version VALUES(11)')
