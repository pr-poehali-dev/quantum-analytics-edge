"""
Административные функции: артисты, контракты, треки, платежи ЮКасса, статистика, посещаемость, релизы, дистрибьюция.
Роутинг через ?action= параметр.
"""
import json
import os
import uuid
import hashlib
import psycopg2
import requests
from requests.auth import HTTPBasicAuth

PACKAGES = {
    'minimal':      {'name': 'Минимальный пакет',     'amount': '5000.00',  'description': 'Продвижение: минимум 10 000 прослушиваний'},
    'medium':       {'name': 'Средний пакет',          'amount': '10000.00', 'description': 'Продвижение: минимум 30 000 прослушиваний'},
    'confident':    {'name': 'Уверенный пакет',        'amount': '15000.00', 'description': 'Продвижение: минимум 50 000 прослушиваний'},
    'professional': {'name': 'Профессиональный пакет', 'amount': '20000.00', 'description': 'Продвижение: от 100 000 прослушиваний'},
}

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def ok(data):
    return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False, default=str)}

def err(status, msg):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg}, ensure_ascii=False)}

def get_user(cur, token, schema):
    cur.execute(f"SELECT u.id, u.role FROM {schema}.sessions s JOIN {schema}.users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW()", (token,))
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    """Административный API. Роутинг через ?action="""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    token = event.get('headers', {}).get('X-Session-Token', '')
    schema = os.environ.get('MAIN_DB_SCHEMA') or 't_p40522734_quantum_analytics_ed'

    # === ПУБЛИЧНЫЕ (без авторизации) ===

    # Трекинг посещения
    if action == 'visit' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        page = body.get('page', '/')[:255]
        session_id = body.get('session_id', '')[:64]
        user_agent = event.get('headers', {}).get('User-Agent', '')[:500]
        try:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"INSERT INTO {schema}.site_visits (page, session_id, user_agent) VALUES (%s, %s, %s)", (page, session_id, user_agent))
            conn.commit()
        except Exception:
            pass
        return ok({'ok': True})

    # Оплата пакета продвижения
    if action == 'paypkg' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        package_id = body.get('package', '').strip()
        customer_name = body.get('name', '').strip()
        customer_contact = body.get('contact', '').strip()
        track_name = body.get('track', '').strip()
        return_url = body.get('return_url', 'https://kalashnikov-sound.ru/')
        if package_id not in PACKAGES:
            return err(400, 'Неверный пакет')
        if not customer_name or not customer_contact:
            return err(400, 'Укажите имя и контакт')
        pkg = PACKAGES[package_id]
        desc = f"{pkg['description']}. Артист: {customer_name}" + (f", трек: {track_name}" if track_name else "")
        r = requests.post(
            'https://api.yookassa.ru/v3/payments',
            json={'amount': {'value': pkg['amount'], 'currency': 'RUB'}, 'confirmation': {'type': 'redirect', 'return_url': return_url}, 'capture': True, 'description': desc, 'metadata': {'package': package_id, 'customer_name': customer_name, 'customer_contact': customer_contact}},
            auth=HTTPBasicAuth(os.environ['YOOKASSA_SHOP_ID'], os.environ['YOOKASSA_SECRET_KEY']),
            headers={'Idempotence-Key': str(uuid.uuid4())}, timeout=15,
        )
        data = r.json()
        if r.status_code not in (200, 201):
            return err(500, data.get('description', f'Ошибка ЮКасса ({r.status_code})'))
        payment_url = data.get('confirmation', {}).get('confirmation_url')
        if not payment_url:
            return err(500, 'ЮКасса не вернула ссылку')
        return ok({'payment_url': payment_url})

    # Вебхук ЮКасса
    if action == 'webhook' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        payment_obj = body.get('object', {})
        payment_id = payment_obj.get('id')
        if body.get('event') == 'payment.succeeded' and payment_id:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {schema}.contracts SET payment_status = 'paid' WHERE yookassa_payment_id = %s", (payment_id,))
            conn.commit()
        return {'statusCode': 200, 'headers': CORS, 'body': 'ok'}

    # === С АВТОРИЗАЦИЕЙ ===
    conn = get_conn()
    cur = conn.cursor()

    # Посещаемость (admin)
    if action == 'visits' and method == 'GET':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        cur.execute(f"SELECT COUNT(*) FROM {schema}.site_visits WHERE visited_at > NOW() - INTERVAL '1 hour'")
        online = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {schema}.site_visits WHERE visited_at::date = CURRENT_DATE")
        today = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {schema}.site_visits WHERE visited_at > NOW() - INTERVAL '7 days'")
        week = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {schema}.site_visits WHERE visited_at > NOW() - INTERVAL '30 days'")
        month = cur.fetchone()[0]
        cur.execute(f"SELECT page, COUNT(*) FROM {schema}.site_visits WHERE visited_at > NOW() - INTERVAL '7 days' GROUP BY page ORDER BY 2 DESC LIMIT 10")
        top_pages = [{'page': r[0], 'visits': r[1]} for r in cur.fetchall()]
        cur.execute(f"SELECT DATE(visited_at), COUNT(*) FROM {schema}.site_visits WHERE visited_at > NOW() - INTERVAL '14 days' GROUP BY 1 ORDER BY 1")
        daily = [{'date': str(r[0]), 'visits': r[1]} for r in cur.fetchall()]
        return ok({'online': online, 'today': today, 'week': week, 'month': month, 'top_pages': top_pages, 'daily': daily})

    # Список артистов (admin)
    if action == 'artists' and method == 'GET':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        cur.execute(f"SELECT id, email, artist_name, created_at FROM {schema}.users WHERE role = 'artist' ORDER BY created_at DESC")
        artists = [{'id': r[0], 'email': r[1], 'artist_name': r[2], 'created_at': str(r[3])} for r in cur.fetchall()]
        return ok({'artists': artists})

    # Создать аккаунт артиста (admin)
    if action == 'create-user' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        email = body.get('email', '').strip().lower()
        artist_name = body.get('artist_name', '').strip()
        password = body.get('password', '').strip()
        if not email or not artist_name or not password:
            return err(400, 'Укажите email, имя и пароль')
        cur.execute(f"SELECT id FROM {schema}.users WHERE email = %s", (email,))
        if cur.fetchone():
            return err(400, 'Пользователь с таким email уже существует')
        pwd_hash = hashlib.sha256(password.encode()).hexdigest()
        cur.execute(f"INSERT INTO {schema}.users (email, password_hash, artist_name, role) VALUES (%s, %s, %s, 'artist') RETURNING id, created_at", (email, pwd_hash, artist_name))
        row = cur.fetchone()
        conn.commit()
        return ok({'user': {'id': row[0], 'email': email, 'artist_name': artist_name, 'created_at': str(row[1])}})

    # Треки артиста
    if action == 'tracks' and method == 'GET':
        u = get_user(cur, token, schema)
        if not u:
            return err(401, 'Не авторизован')
        uid = params.get('user_id') if u[1] == 'admin' else u[0]
        cur.execute(f"SELECT id, title, file_name, file_url, status, notes FROM {schema}.tracks WHERE user_id = %s ORDER BY created_at DESC", (uid,))
        tracks = [{'id': r[0], 'title': r[1], 'file_name': r[2], 'file_url': r[3], 'status': r[4], 'notes': r[5]} for r in cur.fetchall()]
        return ok({'tracks': tracks})

    # Контракты
    if action == 'contracts' and method == 'GET':
        u = get_user(cur, token, schema)
        if not u:
            return err(401, 'Не авторизован')
        uid = params.get('user_id') if u[1] == 'admin' else u[0]
        if uid:
            cur.execute(f"SELECT id, title, contract_status, payment_status, amount, notes, created_at FROM {schema}.contracts WHERE user_id = %s ORDER BY created_at DESC", (uid,))
        else:
            cur.execute(f"SELECT id, title, contract_status, payment_status, amount, notes, created_at FROM {schema}.contracts ORDER BY created_at DESC")
        contracts = [{'id': r[0], 'title': r[1], 'contract_status': r[2], 'payment_status': r[3], 'amount': str(r[4]) if r[4] else None, 'notes': r[5], 'created_at': str(r[6])} for r in cur.fetchall()]
        return ok({'contracts': contracts})

    # Создать контракт (admin)
    if action == 'contracts' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        user_id = body.get('user_id')
        title = body.get('title', '').strip()
        amount = body.get('amount')
        notes = body.get('notes', '')
        if not user_id or not title:
            return err(400, 'Укажите артиста и название')
        cur.execute(f"INSERT INTO {schema}.contracts (user_id, title, amount, notes) VALUES (%s, %s, %s, %s) RETURNING id, created_at", (user_id, title, amount, notes))
        row = cur.fetchone()
        conn.commit()
        return ok({'contract': {'id': row[0], 'title': title, 'contract_status': 'pending', 'payment_status': 'unpaid', 'amount': amount, 'created_at': str(row[1])}})

    # Обновить статус контракта или трека (admin)
    if action == 'update' and method == 'PUT':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        entity = body.get('entity')
        entity_id = body.get('id')
        if entity == 'contract':
            cur.execute(f"UPDATE {schema}.contracts SET contract_status = COALESCE(%s, contract_status), payment_status = COALESCE(%s, payment_status), updated_at = NOW() WHERE id = %s", (body.get('contract_status'), body.get('payment_status'), entity_id))
        elif entity == 'track':
            cur.execute(f"UPDATE {schema}.tracks SET status = COALESCE(%s, status), notes = COALESCE(%s, notes) WHERE id = %s", (body.get('status'), body.get('notes'), entity_id))
        else:
            return err(400, 'Неверный тип')
        conn.commit()
        return ok({'ok': True})

    # Оплата по договору (артист)
    if action == 'pay' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u:
            return err(401, 'Не авторизован')
        body = json.loads(event.get('body') or '{}')
        contract_id = body.get('contract_id')
        return_url = body.get('return_url', 'https://kalashnikov-sound.ru/cabinet')
        if not contract_id:
            return err(400, 'Укажите договор')
        cur.execute(f"SELECT id, title, amount, user_id FROM {schema}.contracts WHERE id = %s", (contract_id,))
        contract = cur.fetchone()
        if not contract:
            return err(404, 'Договор не найден')
        if contract[3] != u[0] and u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        if not contract[2]:
            return err(400, 'Сумма не указана')
        r = requests.post(
            'https://api.yookassa.ru/v3/payments',
            json={'amount': {'value': str(contract[2]), 'currency': 'RUB'}, 'confirmation': {'type': 'redirect', 'return_url': return_url}, 'capture': True, 'description': f'Оплата по договору: {contract[1]}', 'metadata': {'contract_id': str(contract_id)}},
            auth=HTTPBasicAuth(os.environ['YOOKASSA_SHOP_ID'], os.environ['YOOKASSA_SECRET_KEY']),
            headers={'Idempotence-Key': str(uuid.uuid4())},
        )
        data = r.json()
        if r.status_code not in (200, 201):
            return err(500, data.get('description', 'Ошибка ЮКасса'))
        payment_id = data['id']
        payment_url = data['confirmation']['confirmation_url']
        cur.execute(f"UPDATE {schema}.contracts SET yookassa_payment_id = %s, payment_url = %s WHERE id = %s", (payment_id, payment_url, contract_id))
        conn.commit()
        return ok({'payment_url': payment_url})

    # Статистика прослушиваний
    if action == 'statistics' and method == 'GET':
        u = get_user(cur, token, schema)
        if not u:
            return err(401, 'Не авторизован')
        uid = params.get('user_id') if u[1] == 'admin' else u[0]
        if not uid:
            return err(400, 'Укажите артиста')
        cur.execute(f"SELECT id, platform, track_title, streams, period, notes, created_at FROM {schema}.statistics WHERE user_id = %s ORDER BY created_at DESC", (uid,))
        stats = [{'id': r[0], 'platform': r[1], 'track_title': r[2], 'streams': r[3], 'period': r[4], 'notes': r[5], 'created_at': str(r[6])} for r in cur.fetchall()]
        return ok({'statistics': stats})

    # Добавить статистику (admin)
    if action == 'statistics' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        uid = body.get('user_id')
        platform = body.get('platform', '').strip()
        track_title = body.get('track_title', '').strip()
        if not uid or not platform or not track_title:
            return err(400, 'Заполните все поля')
        cur.execute(f"INSERT INTO {schema}.statistics (user_id, platform, track_title, streams, period, notes) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, created_at", (uid, platform, track_title, int(body.get('streams', 0)), body.get('period', ''), body.get('notes', '')))
        row = cur.fetchone()
        conn.commit()
        return ok({'stat': {'id': row[0], 'platform': platform, 'track_title': track_title, 'streams': int(body.get('streams', 0)), 'period': body.get('period', ''), 'notes': body.get('notes', ''), 'created_at': str(row[1])}})

    # Удалить статистику (admin)
    if action == 'del-stat' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        cur.execute(f"DELETE FROM {schema}.statistics WHERE id = %s", (body.get('id'),))
        conn.commit()
        return ok({'ok': True})

    # Сообщения чата
    if action == 'messages' and method == 'GET':
        u = get_user(cur, token, schema)
        if not u:
            return err(401, 'Не авторизован')
        uid = params.get('user_id') if u[1] == 'admin' else u[0]
        cur.execute(f"SELECT id, sender_role, text, created_at FROM {schema}.messages WHERE user_id = %s ORDER BY created_at ASC", (uid,))
        msgs = [{'id': r[0], 'sender_role': r[1], 'text': r[2], 'created_at': str(r[3])} for r in cur.fetchall()]
        return ok({'messages': msgs})

    # Отправить сообщение
    if action == 'send-message' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u:
            return err(401, 'Не авторизован')
        body = json.loads(event.get('body') or '{}')
        text = body.get('text', '').strip()
        uid = body.get('user_id') if u[1] == 'admin' else u[0]
        role = u[1]
        if not text:
            return err(400, 'Пустое сообщение')
        cur.execute(f"INSERT INTO {schema}.messages (user_id, sender_role, text) VALUES (%s, %s, %s) RETURNING id, created_at", (uid, role, text))
        row = cur.fetchone()
        conn.commit()
        return ok({'message': {'id': row[0], 'sender_role': role, 'text': text, 'created_at': str(row[1])}})

    # Релизы
    if action == 'releases' and method == 'GET':
        u = get_user(cur, token, schema)
        if not u:
            return err(401, 'Не авторизован')
        uid = params.get('user_id') if u[1] == 'admin' else u[0]
        if uid:
            cur.execute(f"SELECT id, title, artist_name, upc, cover_url, status, genre, release_date, notes, created_at FROM {schema}.releases WHERE user_id = %s ORDER BY created_at DESC", (uid,))
        else:
            cur.execute(f"SELECT id, title, artist_name, upc, cover_url, status, genre, release_date, notes, created_at FROM {schema}.releases ORDER BY created_at DESC")
        releases = [{'id': r[0], 'title': r[1], 'artist_name': r[2], 'upc': r[3], 'cover_url': r[4], 'status': r[5], 'genre': r[6], 'release_date': str(r[7]) if r[7] else None, 'notes': r[8], 'created_at': str(r[9])} for r in cur.fetchall()]
        return ok({'releases': releases})

    # Создать релиз (admin)
    if action == 'releases' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        uid = body.get('user_id')
        title = body.get('title', '').strip()
        if not uid or not title:
            return err(400, 'Укажите артиста и название')
        cur.execute(
            f"INSERT INTO {schema}.releases (user_id, title, artist_name, upc, cover_url, status, genre, release_date, notes) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id, created_at",
            (uid, title, body.get('artist_name'), body.get('upc') or None, body.get('cover_url') or None, body.get('status', 'moderation'), body.get('genre') or None, body.get('release_date') or None, body.get('notes') or None)
        )
        row = cur.fetchone()
        conn.commit()
        rel = {'id': row[0], 'title': title, 'artist_name': body.get('artist_name'), 'upc': body.get('upc') or None, 'cover_url': body.get('cover_url') or None, 'status': body.get('status', 'moderation'), 'genre': body.get('genre') or None, 'release_date': body.get('release_date') or None, 'notes': body.get('notes') or None, 'created_at': str(row[1])}
        return ok({'release': rel})

    # Обновить релиз (admin)
    if action == 'update-release' and method == 'PUT':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        release_id = body.get('id')
        if not release_id:
            return err(400, 'Укажите id')
        fields = {k: body[k] for k in ('title', 'artist_name', 'upc', 'cover_url', 'status', 'genre', 'release_date', 'notes') if k in body}
        if not fields:
            return err(400, 'Нечего обновлять')
        set_sql = ', '.join(f"{k} = %s" for k in fields)
        cur.execute(f"UPDATE {schema}.releases SET {set_sql}, updated_at = NOW() WHERE id = %s", list(fields.values()) + [release_id])
        conn.commit()
        return ok({'ok': True})

    # Заявка на дистрибьюцию (артист — POST)
    if action == 'distribution' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u:
            return err(401, 'Не авторизован')
        body = json.loads(event.get('body') or '{}')
        cur.execute(f"INSERT INTO {schema}.distribution_requests (user_id, release_id, platforms, message) VALUES (%s,%s,%s,%s) RETURNING id, created_at", (u[0], body.get('release_id') or None, body.get('platforms', ''), body.get('message', '')))
        row = cur.fetchone()
        conn.commit()
        return ok({'request': {'id': row[0], 'status': 'new', 'platforms': body.get('platforms', ''), 'message': body.get('message', ''), 'created_at': str(row[1])}})

    # Список заявок на дистрибьюцию (admin или свои)
    if action == 'distribution' and method == 'GET':
        u = get_user(cur, token, schema)
        if not u:
            return err(401, 'Не авторизован')
        uid = params.get('user_id') if u[1] == 'admin' else u[0]
        if uid:
            cur.execute(f"SELECT id, user_id, release_id, platforms, message, status, created_at FROM {schema}.distribution_requests WHERE user_id = %s ORDER BY created_at DESC", (uid,))
        else:
            cur.execute(f"SELECT id, user_id, release_id, platforms, message, status, created_at FROM {schema}.distribution_requests ORDER BY created_at DESC")
        items = [{'id': r[0], 'user_id': r[1], 'release_id': r[2], 'platforms': r[3], 'message': r[4], 'status': r[5], 'created_at': str(r[6])} for r in cur.fetchall()]
        return ok({'requests': items})

    # Обновить статус заявки (admin)
    if action == 'update-distribution' and method == 'PUT':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        cur.execute(f"UPDATE {schema}.distribution_requests SET status = %s WHERE id = %s", (body.get('status'), body.get('id')))
        conn.commit()
        return ok({'ok': True})

    return err(404, 'Not found')
