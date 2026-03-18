"""
Авторизация артистов: регистрация, вход, выход, проверка сессии.
Действие передаётся через queryStringParameters: ?action=login|register|me|logout
"""
import json
import os
import hashlib
import secrets
import traceback
import psycopg2
from datetime import datetime, timedelta

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def make_token() -> str:
    return secrets.token_hex(32)

def ok(data: dict) -> dict:
    return {'statusCode': 200, 'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False)}

def err(status: int, msg: str) -> dict:
    return {'statusCode': status, 'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg}, ensure_ascii=False)}

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', '')

    try:
        raw_body = event.get('body') or '{}'
        body = json.loads(raw_body)
    except Exception:
        body = {}

    schema = os.environ.get('MAIN_DB_SCHEMA') or 't_p40522734_quantum_analytics_ed'

    try:
        conn = get_conn()
        cur = conn.cursor()
    except Exception as e:
        return err(500, f'DB connection failed: {str(e)}')

    try:
        # Регистрация
        if action == 'register' and method == 'POST':
            email = str(body.get('email', '')).strip().lower()
            password = str(body.get('password', ''))
            artist_name = str(body.get('artist_name', '')).strip()

            if not email or not password or not artist_name:
                return err(400, 'Заполните все поля')
            if len(password) < 6:
                return err(400, 'Пароль минимум 6 символов')

            cur.execute(f'SELECT id FROM {schema}.users WHERE email = %s', (email,))
            if cur.fetchone():
                return err(400, 'Email уже зарегистрирован')

            pw_hash = hash_password(password)
            cur.execute(
                f'INSERT INTO {schema}.users (email, password_hash, artist_name) VALUES (%s, %s, %s) RETURNING id',
                (email, pw_hash, artist_name)
            )
            user_id = cur.fetchone()[0]
            token = make_token()
            expires = datetime.now() + timedelta(days=30)
            cur.execute(
                f'INSERT INTO {schema}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)',
                (user_id, token, expires)
            )
            conn.commit()
            return ok({'token': token, 'user': {'id': user_id, 'email': email, 'artist_name': artist_name, 'role': 'artist'}})

        # Вход
        if action == 'login' and method == 'POST':
            email = str(body.get('email', '')).strip().lower()
            password = str(body.get('password', ''))

            if not email or not password:
                return err(400, 'Заполните все поля')

            # Вход администратора
            admin_password = os.environ.get('ADMIN_PASSWORD', '')
            if email == 'admin' and admin_password and password == admin_password:
                token = make_token()
                expires = datetime.now() + timedelta(days=30)
                cur.execute(f"SELECT id FROM {schema}.users WHERE email = 'admin@kalashnikov-sound.ru'")
                row = cur.fetchone()
                if not row:
                    cur.execute(
                        f"INSERT INTO {schema}.users (email, password_hash, artist_name, role) VALUES ('admin@kalashnikov-sound.ru', %s, 'Администратор', 'admin') RETURNING id",
                        (hash_password(admin_password),)
                    )
                    user_id = cur.fetchone()[0]
                else:
                    user_id = row[0]
                cur.execute(
                    f'INSERT INTO {schema}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)',
                    (user_id, token, expires)
                )
                conn.commit()
                return ok({'token': token, 'user': {'id': user_id, 'email': 'admin', 'artist_name': 'Администратор', 'role': 'admin'}})

            pw_hash = hash_password(password)
            cur.execute(
                f'SELECT id, email, artist_name, role FROM {schema}.users WHERE email = %s AND password_hash = %s',
                (email, pw_hash)
            )
            user = cur.fetchone()
            if not user:
                return err(401, 'Неверный email или пароль')

            token = make_token()
            expires = datetime.now() + timedelta(days=30)
            cur.execute(
                f'INSERT INTO {schema}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)',
                (user[0], token, expires)
            )
            conn.commit()
            return ok({'token': token, 'user': {'id': user[0], 'email': user[1], 'artist_name': user[2], 'role': user[3]}})

        # Проверка токена
        if action == 'me' and method == 'GET':
            token = event.get('headers', {}).get('X-Session-Token', '')
            if not token:
                return err(401, 'Не авторизован')
            cur.execute(f'''
                SELECT u.id, u.email, u.artist_name, u.role
                FROM {schema}.sessions s
                JOIN {schema}.users u ON u.id = s.user_id
                WHERE s.token = %s AND s.expires_at > NOW()
            ''', (token,))
            user = cur.fetchone()
            if not user:
                return err(401, 'Сессия истекла')
            return ok({'user': {'id': user[0], 'email': user[1], 'artist_name': user[2], 'role': user[3]}})

        # Выход
        if action == 'logout' and method == 'POST':
            token = event.get('headers', {}).get('X-Session-Token', '')
            if token:
                cur.execute(f'UPDATE {schema}.sessions SET expires_at = NOW() WHERE token = %s', (token,))
                conn.commit()
            return ok({'ok': True})

        return err(404, f'Unknown action: {action}')

    except Exception as e:
        tb = traceback.format_exc()
        print(f'[ERROR] {tb}')
        return err(500, f'Ошибка сервера: {str(e)}')
    finally:
        try:
            conn.close()
        except Exception:
            pass