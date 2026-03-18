"""
Административные функции: список артистов, управление контрактами и статусами треков.
"""
import json
import os
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def json_response(status: int, data: dict) -> dict:
    return {'statusCode': status, 'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False, default=str)}

def get_user(cur, token: str, schema: str):
    cur.execute(f'''
        SELECT u.id, u.role FROM {schema}.sessions s
        JOIN {schema}.users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW()
    ''', (token,))
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    token = event.get('headers', {}).get('X-Session-Token', '')
    path = event.get('path', '/')
    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')

    conn = get_conn()
    cur = conn.cursor()

    user = get_user(cur, token, schema)
    if not user or user[1] != 'admin':
        return json_response(403, {'error': 'Доступ запрещён'})

    # Список артистов
    if (path.endswith('/artists') or path == '/') and method == 'GET':
        cur.execute(f"SELECT id, email, artist_name, created_at FROM {schema}.users WHERE role = 'artist' ORDER BY created_at DESC")
        rows = cur.fetchall()
        artists = [{'id': r[0], 'email': r[1], 'artist_name': r[2], 'created_at': str(r[3])} for r in rows]
        return json_response(200, {'artists': artists})

    # Создать контракт
    if path.endswith('/contracts') and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        user_id = body.get('user_id')
        title = body.get('title', '').strip()
        amount = body.get('amount')
        notes = body.get('notes', '')

        if not user_id or not title:
            return json_response(400, {'error': 'Укажите артиста и название'})

        cur.execute(f'INSERT INTO {schema}.contracts (user_id, title, amount, notes) VALUES (%s, %s, %s, %s) RETURNING id, created_at', (user_id, title, amount, notes))
        row = cur.fetchone()
        conn.commit()
        return json_response(200, {'contract': {'id': row[0], 'title': title, 'contract_status': 'pending', 'payment_status': 'unpaid', 'amount': amount, 'created_at': str(row[1])}})

    # Обновить статус контракта или трека
    if path.endswith('/update') and method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        entity = body.get('entity')  # 'contract' или 'track'
        entity_id = body.get('id')

        if entity == 'contract':
            contract_status = body.get('contract_status')
            payment_status = body.get('payment_status')
            cur.execute(f"UPDATE {schema}.contracts SET contract_status = COALESCE(%s, contract_status), payment_status = COALESCE(%s, payment_status), updated_at = NOW() WHERE id = %s", (contract_status, payment_status, entity_id))
        elif entity == 'track':
            status = body.get('status')
            notes = body.get('notes')
            cur.execute(f"UPDATE {schema}.tracks SET status = COALESCE(%s, status), notes = COALESCE(%s, notes) WHERE id = %s", (status, notes, entity_id))
        else:
            return json_response(400, {'error': 'Неверный тип'})

        conn.commit()
        return json_response(200, {'ok': True})

    # Контракты артиста
    if path.endswith('/contracts') and method == 'GET':
        params = event.get('queryStringParameters') or {}
        target_user_id = params.get('user_id')
        if target_user_id:
            cur.execute(f'SELECT id, title, contract_status, payment_status, amount, notes, created_at FROM {schema}.contracts WHERE user_id = %s ORDER BY created_at DESC', (target_user_id,))
        else:
            cur.execute(f'SELECT id, title, contract_status, payment_status, amount, notes, created_at FROM {schema}.contracts ORDER BY created_at DESC')
        rows = cur.fetchall()
        contracts = [{'id': r[0], 'title': r[1], 'contract_status': r[2], 'payment_status': r[3], 'amount': str(r[4]) if r[4] else None, 'notes': r[5], 'created_at': str(r[6])} for r in rows]
        return json_response(200, {'contracts': contracts})

    return json_response(404, {'error': 'Not found'})