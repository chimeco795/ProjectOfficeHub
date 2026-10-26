"""Additive explicit role capability and persistent team identity (schema 13)."""
import sqlite3
from datetime import datetime,timezone

def migrate_consolidation(db,data):
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]!=12:return
    db.commit()
    if db.execute('SELECT COUNT(*) FROM projects').fetchone()[0]:
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
        with sqlite3.connect(data/f'backup-v12-{stamp}.sqlite3') as backup:db.backup(backup)
    db.execute('BEGIN IMMEDIATE')
    db.execute('ALTER TABLE roles ADD COLUMN manages_multiple_teams INTEGER NOT NULL DEFAULT 0 CHECK(manages_multiple_teams IN (0,1))')
    for row in db.execute('SELECT id,name FROM roles').fetchall():
        if ''.join(c for c in row['name'].casefold() if not c.isspace() and c not in '_-')=='techlead':
            db.execute('UPDATE roles SET manages_multiple_teams=1 WHERE id=?',(row['id'],))
    db.execute('ALTER TABLE teams ADD COLUMN code TEXT')
    db.execute("ALTER TABLE teams ADD COLUMN color TEXT NOT NULL DEFAULT '#246b58'")
    db.execute("ALTER TABLE teams ADD COLUMN shape TEXT NOT NULL DEFAULT 'circle'")
    colors=['#246b58','#365baa','#9a5a17','#82378b','#9e3946']
    shapes=['circle','diamond','square','triangle','hexagon']
    for index,row in enumerate(db.execute('SELECT id FROM teams ORDER BY id').fetchall()):
        db.execute('UPDATE teams SET code=?,color=?,shape=? WHERE id=?',(f'EQ{index+1}',colors[index%5],shapes[index%5],row['id']))
    db.execute('CREATE UNIQUE INDEX teams_code ON teams(code COLLATE NOCASE)')
    db.execute('INSERT INTO schema_version VALUES(13)')
