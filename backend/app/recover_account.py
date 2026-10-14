"""Local filesystem owner fallback when no email transport/other Admin is available.

Run from backend: python -m app.recover_account --email name@example.com
Only issues an expiring link; the account owner enters the new password in the UI.
"""
import argparse
import secrets
import time
from .db import initialize,connection
from .auth import digest,audit,stamp

def issue(email):
    initialize()
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        account=db.execute('SELECT id FROM access_accounts WHERE email=? AND active=1',(email.strip().lower(),)).fetchone()
        if not account:
            raise ValueError('Cuenta activa no encontrada.')
        token=secrets.token_urlsafe(32)
        db.execute('DELETE FROM access_reset_tokens WHERE account_id=?',(account['id'],))
        db.execute('INSERT INTO access_reset_tokens VALUES(?,?,?,0,?)',(digest(token),account['id'],time.time()+1800,stamp()))
        audit(db,account['id'],None,'local-owner-reset')
    return '/#reset='+token

if __name__=='__main__':
    parser=argparse.ArgumentParser(description='Recuperación local de cuenta, enlace de un solo uso de 30 minutos.')
    parser.add_argument('--email',required=True)
    args=parser.parse_args()
    try:
        print('Abre este enlace sólo en el equipo que ejecuta ProjectOfficeHub:')
        print('http://127.0.0.1:8011'+issue(args.email))
    except ValueError as error:
        parser.exit(1,str(error)+'\n')
