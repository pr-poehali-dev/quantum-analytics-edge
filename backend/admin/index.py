"""
Административные функции и оплата: артисты, контракты, треки, платежи ЮКасса.
"""
import json
import os
import uuid
import psycopg2
import requests
from requests.auth import HTTPBasicAuth

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
    schema = os.environ.get('MAIN_DB_SCHEMA') or 't_p40522734_quantum_analytics_ed'

    conn = get_conn()
    cur = conn.cursor()

    # Вебхук от ЮКасса (без авторизации)
    if path.endswith('/webhook') and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        event_type = body.get('event', '')
        payment_obj = body.get('object', {})
        payment_id = payment_obj.get('id')
        if event_type == 'payment.succeeded' and payment_id:
            cur.execute(f"UPDATE {schema}.contracts SET payment_status = 'paid' WHERE yookassa_payment_id = %s", (payment_id,))
            conn.commit()
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': 'ok'}

    # Создание платежа (артист)
    if path.endswith('/pay') and method == 'POST':
        user = get_user(cur, token, schema)
        if not user:
            return json_response(401, {'error': 'Не авторизован'})

        body = json.loads(event.get('body') or '{}')
        contract_id = body.get('contract_id')
        return_url = body.get('return_url', 'https://kalashnikov-sound.ru/cabinet')

        if not contract_id:
            return json_response(400, {'error': 'Укажите договор'})

        cur.execute(f'SELECT id, title, amount, user_id FROM {schema}.contracts WHERE id = %s', (contract_id,))
        contract = cur.fetchone()
        if not contract:
            return json_response(404, {'error': 'Договор не найден'})
        if contract[3] != user[0] and user[1] != 'admin':
            return json_response(403, {'error': 'Доступ запрещён'})
        if not contract[2]:
            return json_response(400, {'error': 'Сумма договора не указана'})

        shop_id = os.environ['YOOKASSA_SHOP_ID']
        secret_key = os.environ['YOOKASSA_SECRET_KEY']
        idempotence_key = str(uuid.uuid4())

        resp = requests.post(
            'https://api.yookassa.ru/v3/payments',
            json={
                'amount': {'value': str(contract[2]), 'currency': 'RUB'},
                'confirmation': {'type': 'redirect', 'return_url': return_url},
                'capture': True,
                'description': f'Оплата по договору: {contract[1]}',
                'metadata': {'contract_id': str(contract_id)},
            },
            auth=HTTPBasicAuth(shop_id, secret_key),
            headers={'Idempotence-Key': idempotence_key},
        )
        data = resp.json()
        if resp.status_code != 200:
            return json_response(500, {'error': data.get('description', 'Ошибка ЮКасса')})

        payment_id = data['id']
        payment_url = data['confirmation']['confirmation_url']
        cur.execute(f"UPDATE {schema}.contracts SET yookassa_payment_id = %s, payment_url = %s WHERE id = %s", (payment_id, payment_url, contract_id))
        conn.commit()
        return json_response(200, {'payment_url': payment_url})

    # Все остальные маршруты — только для admin
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
        entity = body.get('entity')
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

    # Контракты
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