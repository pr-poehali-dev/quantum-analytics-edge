"""
Чат между артистом и администратором.
"""
import json
import os
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def json_response(status: int, data: dict) -> dict:
    return {'statusCode': status, 'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False, default=str)}

def get_user(cur, token: str, schema: str):
    cur.execute(f'''
        SELECT u.id, u.role, u.artist_name FROM {schema}.sessions s
        JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW()
    ''', (token,))
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    token = event.get('headers', {}).get('X-Session-Token', '')
    schema = os.environ.get('MAIN_DB_SCHEMA') or 't_p40522734_quantum_analytics_ed'

    conn = get_conn()
    cur = conn.cursor()

    user = get_user(cur, token, schema)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})

    user_id, role, artist_name = user

    # Отправка сообщения
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        text = body.get('text', '').strip()
        target_user_id = body.get('user_id', user_id) if role == 'admin' else user_id

        if not text:
            return json_response(400, {'error': 'Сообщение не может быть пустым'})

        cur.execute(f'INSERT INTO {schema}.messages (user_id, sender_role, text) VALUES (%s, %s, %s) RETURNING id, created_at', (target_user_id, role, text))
        row = cur.fetchone()
        conn.commit()

        return json_response(200, {'message': {'id': row[0], 'sender_role': role, 'text': text, 'created_at': str(row[1])}})

    # Получение сообщений
    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        target_user_id = user_id
        if role == 'admin' and params.get('user_id'):
            target_user_id = int(params['user_id'])

        cur.execute(f'SELECT id, sender_role, text, created_at FROM {schema}.messages WHERE user_id = %s ORDER BY created_at ASC', (target_user_id,))
        rows = cur.fetchall()
        msgs = [{'id': r[0], 'sender_role': r[1], 'text': r[2], 'created_at': str(r[3])} for r in rows]
        return json_response(200, {'messages': msgs})

    return json_response(404, {'error': 'Not found'})