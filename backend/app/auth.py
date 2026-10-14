"""Local access accounts and opaque, revocable sessions; independent of PMO roles."""
import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from .db import connection

router = APIRouter(prefix='/api/auth', tags=['Access'])
COOKIE = os.environ.get('PMO_SESSION_COOKIE','pohub_session')
if not re.fullmatch(r'[A-Za-z0-9_]+',COOKIE):
    raise RuntimeError('PMO_SESSION_COOKIE debe ser un nombre de cookie válido.')
ROLES = ('Admin', 'Gestor', 'Miembro', 'Consulta')
PUBLIC = {'/api/health', '/api/auth/status', '/api/auth/bootstrap', '/api/auth/login', '/api/auth/recover', '/api/auth/reset'}

def stamp():
    return datetime.now(timezone.utc).isoformat()

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

def password_hash(password):
    salt = secrets.token_bytes(16)
    key = hashlib.scrypt(password.encode(), salt=salt, n=32768, r=8, p=3, maxmem=64*1024*1024, dklen=32)
    return 'scrypt$32768$8$3$'+salt.hex()+'$'+key.hex()

def verify(password, stored):
    try:
        algorithm, n, r, p, salt, key = stored.split('$')
        if algorithm != 'scrypt' or (n, r, p) != ('32768', '8', '3'):
            return False
        actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p), maxmem=64*1024*1024, dklen=32)
        return hmac.compare_digest(actual.hex(), key)
    except (ValueError, TypeError):
        return False

DUMMY_HASH = password_hash(secrets.token_urlsafe(32))

def migrate_access(db, data):
    if db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0] != 11:
        return
    db.commit()
    if db.execute('SELECT COUNT(*) FROM projects').fetchone()[0]:
        name = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
        with sqlite3.connect(data / f'backup-v11-{name}.sqlite3') as backup:
            db.backup(backup)
    db.executescript('''
    BEGIN IMMEDIATE;
    CREATE TABLE access_accounts(
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL, password_hash TEXT NOT NULL,
      security_role TEXT NOT NULL CHECK(security_role IN ('Admin','Gestor','Miembro','Consulta')),
      active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
      person_id TEXT REFERENCES people(id), preferences TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE access_sessions(
      token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES access_accounts(id),
      csrf TEXT NOT NULL, expires_at REAL NOT NULL, last_seen REAL NOT NULL,
      idle_seconds INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX access_sessions_account ON access_sessions(account_id);
    CREATE TABLE access_reset_tokens(
      token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES access_accounts(id),
      expires_at REAL NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
    CREATE TABLE access_attempts(key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, starts_at REAL NOT NULL);
    CREATE TABLE access_audit(id INTEGER PRIMARY KEY, account_id TEXT REFERENCES access_accounts(id),
      actor_id TEXT REFERENCES access_accounts(id), event TEXT NOT NULL, changed_at TEXT NOT NULL);
    INSERT INTO schema_version VALUES(12);
    COMMIT;
    ''')

def audit(db, account_id, actor, event):
    db.execute('INSERT INTO access_audit(account_id,actor_id,event,changed_at) VALUES(?,?,?,?)', (account_id, actor, event, stamp()))

def public_account(row):
    import json
    return {key: row[key] for key in ('id','email','name','security_role','active','person_id','version')} | {'preferences': json.loads(row['preferences'])}

def same_origin(request):
    origin = request.headers.get('origin')
    if origin and origin != f'{request.url.scheme}://{request.url.netloc}':
        raise HTTPException(403, 'Origen no permitido.')
    if request.headers.get('sec-fetch-site') == 'cross-site':
        raise HTTPException(403, 'Origen no permitido.')

def require_account(request):
    account = getattr(request.state, 'account', None)
    if not account:
        raise HTTPException(401, 'Inicia sesión para continuar.')
    return account

def require_admin(request):
    account = require_account(request)
    if account['security_role'] != 'Admin':
        raise HTTPException(403, 'Esta acción requiere un administrador.')
    return account

def throttle(key, maximum=10):
    now = time.time()
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        row = db.execute('SELECT * FROM access_attempts WHERE key=?', (key,)).fetchone()
        if row and now-row['starts_at'] < 900:
            if row['attempts'] >= maximum:
                raise HTTPException(429, 'Demasiados intentos. Inténtalo más tarde.')
            db.execute('UPDATE access_attempts SET attempts=attempts+1 WHERE key=?', (key,))
        else:
            db.execute('INSERT OR REPLACE INTO access_attempts VALUES(?,?,?)', (key, 1, now))

def session(db, account, response, request, remember=False):
    now = time.time()
    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    lifetime = 30*86400 if remember else 12*3600
    idle = 7*86400 if remember else 1800
    db.execute('DELETE FROM access_sessions WHERE expires_at<=? OR last_seen+idle_seconds<=?',(now,now))
    db.execute('INSERT INTO access_sessions VALUES(?,?,?,?,?,?,?)', (digest(token), account['id'], csrf, now+lifetime, now, idle, stamp()))
    response.set_cookie(COOKIE, token, httponly=True, secure=request.url.scheme=='https', samesite='strict', path='/', max_age=lifetime if remember else None)
    return {'account': public_account(account), 'csrf': csrf, 'expires_at': now+lifetime, 'idle_seconds':idle}

def write_allowed(db, account, path):
    if account['security_role'] in ('Admin', 'Gestor'):
        return True
    if account['security_role'] != 'Miembro' or not account['person_id']:
        return False
    match = re.fullmatch(r'/api/projects/([^/]+)/(items(?:/[^/]+)?|pmo/events(?:/[^/]+)?|events/[^/]+/move|documents(?:/[^/]+(?:/links)?)?|items/[^/]+/comments|schedule/items/[^/]+/dates-(?:preview|apply))', path)
    return bool(match and db.execute('SELECT 1 FROM project_people WHERE project_id=? AND person_id=?', (match[1], account['person_id'])).fetchone())

async def access_middleware(request, call_next):
    path = request.url.path
    try:
        if path.startswith('/api/'):
            unsafe = request.method not in ('GET','HEAD','OPTIONS')
            if unsafe:
                same_origin(request)
            if path not in PUBLIC:
                token = request.cookies.get(COOKIE, '')
                now = time.time()
                with connection() as db:
                    row = db.execute('SELECT s.*,a.active FROM access_sessions s JOIN access_accounts a ON a.id=s.account_id WHERE s.token_hash=?', (digest(token),)).fetchone()
                    if not row or not row['active'] or row['expires_at'] <= now or row['last_seen']+row['idle_seconds'] <= now:
                        if row:
                            db.execute('DELETE FROM access_sessions WHERE token_hash=?', (digest(token),))
                        raise HTTPException(401, 'La sesión terminó. Inicia sesión para continuar.')
                    account = db.execute('SELECT * FROM access_accounts WHERE id=?', (row['account_id'],)).fetchone()
                    request.state.account = dict(account)
                    request.state.session_hash = digest(token)
                    request.state.csrf = row['csrf']
                    request.state.expires_at = row['expires_at']
                    request.state.idle_seconds = row['idle_seconds']
                    if unsafe and not hmac.compare_digest(request.headers.get('x-pohub-csrf',''), row['csrf']):
                        raise HTTPException(403, 'Recarga la sesión antes de guardar.')
                    if unsafe and not path.startswith('/api/auth/') and not write_allowed(db, account, path):
                        raise HTTPException(403, 'Tu cuenta no tiene permiso para modificar estos datos.')
                    if now-row['last_seen'] > 60:
                        db.execute('UPDATE access_sessions SET last_seen=? WHERE token_hash=?', (now, digest(token)))
    except HTTPException as exc:
        return JSONResponse({'detail': exc.detail}, status_code=exc.status_code, headers={'Cache-Control':'no-store'})
    response = await call_next(request)
    if path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store'
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response

class Identity(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    @field_validator('email')
    @classmethod
    def email_valid(cls, value):
        value = value.strip().lower()
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
            raise ValueError('Correo no válido')
        return value

class Credentials(Identity):
    password: str = Field(min_length=1,max_length=1024)
    remember: bool = False

class NewAccount(Identity):
    name: str = Field(min_length=1,max_length=150)
    password: str = Field(min_length=12,max_length=1024)
    security_role: Literal['Admin','Gestor','Miembro','Consulta'] = 'Consulta'
    person_id: str | None = None
    @field_validator('name')
    @classmethod
    def name_valid(cls, value):
        if not value.strip():
            raise ValueError('Nombre requerido')
        return value.strip()

def create_account(db, value, role=None):
    if value.person_id and not db.execute('SELECT 1 FROM people WHERE id=?', (value.person_id,)).fetchone():
        raise HTTPException(422, 'Persona no encontrada.')
    account_id = str(uuid4())
    try:
        db.execute('INSERT INTO access_accounts(id,email,name,password_hash,security_role,person_id,created_at) VALUES(?,?,?,?,?,?,?)', (account_id,value.email,value.name,password_hash(value.password),role or value.security_role,value.person_id,stamp()))
    except sqlite3.IntegrityError:
        raise HTTPException(409, 'Ya existe una cuenta con ese correo.')
    return db.execute('SELECT * FROM access_accounts WHERE id=?', (account_id,)).fetchone()

@router.get('/status')
def status():
    with connection() as db:
        return {'setup_required': not bool(db.execute('SELECT 1 FROM access_accounts LIMIT 1').fetchone()), 'recovery_email_configured': False}

@router.post('/bootstrap', status_code=201)
def bootstrap(value: NewAccount, request: Request, response: Response):
    if request.client and request.client.host not in ('127.0.0.1','::1','testclient'):
        raise HTTPException(403, 'La configuración inicial requiere acceso local.')
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        if db.execute('SELECT 1 FROM access_accounts LIMIT 1').fetchone():
            raise HTTPException(409, 'La configuración inicial ya está completa.')
        account = create_account(db, value, 'Admin')
        audit(db, account['id'], account['id'], 'bootstrap')
        return session(db, account, response, request)

@router.post('/login')
def login(value: Credentials, request: Request, response: Response):
    ip = request.client.host if request.client else 'local'
    key = 'login:'+digest(ip+'|'+value.email)
    throttle('login-ip:'+digest(ip), 60)
    throttle(key)
    with connection() as db:
        account = db.execute('SELECT * FROM access_accounts WHERE email=?', (value.email,)).fetchone()
        valid = verify(value.password, account['password_hash'] if account else DUMMY_HASH)
        if not valid or not account or not account['active']:
            raise HTTPException(401, 'Correo o contraseña incorrectos.')
        db.execute('DELETE FROM access_attempts WHERE key=?', (key,))
        old = request.cookies.get(COOKIE)
        if old:
            db.execute('DELETE FROM access_sessions WHERE token_hash=?', (digest(old),))
        audit(db, account['id'], account['id'], 'login')
        return session(db, account, response, request, value.remember)

@router.get('/me')
def me(request: Request):
    return {'account': public_account(require_account(request)), 'csrf': request.state.csrf, 'expires_at':request.state.expires_at, 'idle_seconds':request.state.idle_seconds}

@router.post('/logout')
def logout(request: Request, response: Response):
    account = require_account(request)
    with connection() as db:
        db.execute('DELETE FROM access_sessions WHERE token_hash=?', (request.state.session_hash,))
        audit(db, account['id'], account['id'], 'logout')
    response.delete_cookie(COOKIE, path='/', httponly=True, samesite='strict')
    return {'signed_out': True}

class Profile(BaseModel):
    name: str = Field(min_length=1,max_length=150)

@router.put('/profile')
def profile(value: Profile, request: Request):
    account = require_account(request)
    if not value.name.strip():
        raise HTTPException(422, 'Nombre requerido.')
    with connection() as db:
        db.execute('UPDATE access_accounts SET name=?,version=version+1 WHERE id=?', (value.name.strip(),account['id']))
        audit(db, account['id'], account['id'], 'profile')
        return public_account(db.execute('SELECT * FROM access_accounts WHERE id=?', (account['id'],)).fetchone())

class Preferences(BaseModel):
    catalog_views: dict[str,Literal['list','cards']] = Field(default_factory=dict,max_length=20)

@router.put('/preferences')
def preferences(value: Preferences, request: Request):
    import json
    account = require_account(request)
    if any(key not in ('people','roles','raid','documents','portfolio') for key in value.catalog_views):
        raise HTTPException(422,'Preferencia desconocida.')
    with connection() as db:
        db.execute('UPDATE access_accounts SET preferences=?,version=version+1 WHERE id=?', (json.dumps(value.model_dump()),account['id']))
        return public_account(db.execute('SELECT * FROM access_accounts WHERE id=?', (account['id'],)).fetchone())

class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1,max_length=1024)
    new_password: str = Field(min_length=12,max_length=1024)

@router.post('/password')
def change_password(value: PasswordChange, request: Request, response: Response):
    account = require_account(request)
    throttle('password:'+account['id'])
    if not verify(value.current_password, account['password_hash']):
        raise HTTPException(400, 'Contraseña actual incorrecta.')
    new_hash = password_hash(value.new_password)
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        changed = db.execute('UPDATE access_accounts SET password_hash=?,version=version+1 WHERE id=? AND password_hash=?', (new_hash,account['id'],account['password_hash']))
        if not changed.rowcount:
            raise HTTPException(409,'La cuenta cambió. Inicia sesión de nuevo.')
        db.execute('DELETE FROM access_sessions WHERE account_id=?', (account['id'],))
        db.execute('DELETE FROM access_reset_tokens WHERE account_id=?', (account['id'],))
        audit(db, account['id'], account['id'], 'password')
        return session(db, db.execute('SELECT * FROM access_accounts WHERE id=?', (account['id'],)).fetchone(), response, request)

@router.post('/recover')
def recover(value: Identity, request: Request):
    throttle('recover:'+digest(request.client.host if request.client else 'local'), 10)
    # No transport configured: never claim an email was sent or reveal account existence.
    return {'message':'Si existe una cuenta asociada, recibirás instrucciones.', 'email_configured':False, 'help':'El envío automático no está configurado. Contacta al administrador para obtener un enlace temporal.'}

@router.get('/accounts')
def accounts(request: Request):
    require_admin(request)
    with connection() as db:
        return [public_account(r) for r in db.execute('SELECT * FROM access_accounts ORDER BY name')]

@router.post('/accounts',status_code=201)
def add_account(value: NewAccount, request: Request):
    actor = require_admin(request)
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        account = create_account(db,value)
        audit(db,account['id'],actor['id'],'create')
        return public_account(account)

class AccountUpdate(BaseModel):
    version: int = Field(ge=1)
    security_role: Literal['Admin','Gestor','Miembro','Consulta']
    active: bool
    person_id: str | None = None

@router.put('/accounts/{account_id}')
def edit_account(account_id: str,value: AccountUpdate,request: Request):
    actor = require_admin(request)
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        old = db.execute('SELECT * FROM access_accounts WHERE id=?',(account_id,)).fetchone()
        if not old:
            raise HTTPException(404,'Cuenta no encontrada.')
        if old['version'] != value.version:
            raise HTTPException(409,'La cuenta cambió. Recarga antes de guardar.')
        if old['active'] and old['security_role']=='Admin' and (not value.active or value.security_role!='Admin') and db.execute("SELECT COUNT(*) FROM access_accounts WHERE active=1 AND security_role='Admin'").fetchone()[0]<=1:
            raise HTTPException(409,'Debe permanecer al menos un administrador activo.')
        if value.person_id and not db.execute('SELECT 1 FROM people WHERE id=?',(value.person_id,)).fetchone():
            raise HTTPException(422,'Persona no encontrada.')
        db.execute('UPDATE access_accounts SET security_role=?,active=?,person_id=?,version=version+1 WHERE id=?',(value.security_role,value.active,value.person_id,account_id))
        db.execute('DELETE FROM access_sessions WHERE account_id=?',(account_id,))
        audit(db,account_id,actor['id'],'permissions')
        return public_account(db.execute('SELECT * FROM access_accounts WHERE id=?',(account_id,)).fetchone())

@router.post('/accounts/{account_id}/reset-link')
def reset_link(account_id: str, request: Request):
    actor = require_admin(request)
    token = secrets.token_urlsafe(32)
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        if not db.execute('SELECT 1 FROM access_accounts WHERE id=? AND active=1',(account_id,)).fetchone():
            raise HTTPException(404,'Cuenta activa no encontrada.')
        db.execute('DELETE FROM access_reset_tokens WHERE account_id=?',(account_id,))
        db.execute('INSERT INTO access_reset_tokens VALUES(?,?,?,0,?)',(digest(token),account_id,time.time()+1800,stamp()))
        audit(db,account_id,actor['id'],'reset-link')
    # Fragment stays out of server access logs and Referer headers.
    return {'path':'/#reset='+token,'expires_in':1800}

class ResetPassword(BaseModel):
    token: str = Field(min_length=40,max_length=100)
    new_password: str = Field(min_length=12,max_length=1024)

@router.post('/reset')
def reset_password(value: ResetPassword,request: Request,response: Response):
    throttle('reset:'+digest(request.client.host if request.client else 'local'),20)
    new_hash = password_hash(value.new_password)
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        row = db.execute('SELECT r.*,a.active FROM access_reset_tokens r JOIN access_accounts a ON a.id=r.account_id WHERE r.token_hash=?',(digest(value.token),)).fetchone()
        if not row or row['used'] or row['expires_at']<=time.time() or not row['active']:
            raise HTTPException(400,'Enlace inválido o vencido. Solicita uno nuevo.')
        db.execute('UPDATE access_reset_tokens SET used=1 WHERE token_hash=?',(digest(value.token),))
        db.execute('UPDATE access_accounts SET password_hash=?,version=version+1 WHERE id=?',(new_hash,row['account_id']))
        db.execute('DELETE FROM access_sessions WHERE account_id=?',(row['account_id'],))
        db.execute('DELETE FROM access_sessions WHERE token_hash=?',(digest(request.cookies.get(COOKIE,'')),))
        audit(db,row['account_id'],None,'reset-password')
    response.delete_cookie(COOKIE,path='/',httponly=True,samesite='strict')
    return {'message':'Contraseña actualizada. Inicia sesión.'}
