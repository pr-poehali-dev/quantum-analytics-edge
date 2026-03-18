"""
Авторизация артистов: регистрация, вход, выход, проверка сессии.
"""
import json
import os
import hashlib
import secrets
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

def json_response(status: int, data: dict) -> dict:
    return {'statusCode': status, 'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False)}

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    body = json.loads(event.get('body') or '{}')

    conn = get_conn()
    cur = conn.cursor()
    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')

    # Регистрация
    if path.endswith('/register') and method == 'POST':
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')
        artist_name = body.get('artist_name', '').strip()

        if not email or not password or not artist_name:
            return json_response(400, {'error': 'Заполните все поля'})
        if len(password) < 6:
            return json_response(400, {'error': 'Пароль минимум 6 символов'})

        cur.execute(f'SELECT id FROM {schema}.users WHERE email = %s', (email,))
        if cur.fetchone():
            return json_response(400, {'error': 'Email уже зарегистрирован'})

        pw_hash = hash_password(password)
        cur.execute(f'INSERT INTO {schema}.users (email, password_hash, artist_name) VALUES (%s, %s, %s) RETURNING id', (email, pw_hash, artist_name))
        user_id = cur.fetchone()[0]

        token = make_token()
        expires = datetime.now() + timedelta(days=30)
        cur.execute(f'INSERT INTO {schema}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)', (user_id, token, expires))
        conn.commit()

        return json_response(200, {'token': token, 'user': {'id': user_id, 'email': email, 'artist_name': artist_name, 'role': 'artist'}})

    # Вход
    if path.endswith('/login') and method == 'POST':
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')

        # Проверка входа администратора
        admin_password = os.environ.get('ADMIN_PASSWORD', '')
        if email == 'admin' and admin_password and password == admin_password:
            token = make_token()
            expires = datetime.now() + timedelta(days=30)
            cur.execute(f"SELECT id FROM {schema}.users WHERE email = 'admin@kalashnikovsound.ru'")
            row = cur.fetchone()
            if not row:
                cur.execute(f"INSERT INTO {schema}.users (email, password_hash, artist_name, role) VALUES ('admin@kalashnikovsound.ru', %s, 'Администратор', 'admin') RETURNING id", (hash_password(admin_password),))
                user_id = cur.fetchone()[0]
            else:
                user_id = row[0]
            cur.execute(f'INSERT INTO {schema}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)', (user_id, token, expires))
            conn.commit()
            return json_response(200, {'token': token, 'user': {'id': user_id, 'email': 'admin', 'artist_name': 'Администратор', 'role': 'admin'}})

        if not email or not password:
            return json_response(400, {'error': 'Заполните все поля'})

        pw_hash = hash_password(password)
        cur.execute(f'SELECT id, email, artist_name, role FROM {schema}.users WHERE email = %s AND password_hash = %s', (email, pw_hash))
        user = cur.fetchone()
        if not user:
            return json_response(401, {'error': 'Неверный email или пароль'})

        token = make_token()
        expires = datetime.now() + timedelta(days=30)
        cur.execute(f'INSERT INTO {schema}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)', (user[0], token, expires))
        conn.commit()

        return json_response(200, {'token': token, 'user': {'id': user[0], 'email': user[1], 'artist_name': user[2], 'role': user[3]}})

    # Проверка токена
    if path.endswith('/me') and method == 'GET':
        token = event.get('headers', {}).get('X-Session-Token', '')
        if not token:
            return json_response(401, {'error': 'Не авторизован'})

        cur.execute(f'''
            SELECT u.id, u.email, u.artist_name, u.role FROM {schema}.sessions s
            JOIN {schema}.users u ON u.id = s.user_id
            WHERE s.token = %s AND s.expires_at > NOW()
        ''', (token,))
        user = cur.fetchone()
        if not user:
            return json_response(401, {'error': 'Сессия истекла'})

        return json_response(200, {'user': {'id': user[0], 'email': user[1], 'artist_name': user[2], 'role': user[3]}})

    # Выход
    if path.endswith('/logout') and method == 'POST':
        token = event.get('headers', {}).get('X-Session-Token', '')
        if token:
            cur.execute(f'UPDATE {schema}.sessions SET expires_at = NOW() WHERE token = %s', (token,))
            conn.commit()
        return json_response(200, {'ok': True})

    return json_response(404, {'error': 'Not found'})
