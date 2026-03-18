"""
Административные функции: артисты, контракты, треки, платежи ЮКасса, статистика прослушиваний, посещаемость сайта, пакеты продвижения.
"""
import json
import os
import uuid
import psycopg2
import requests
from requests.auth import HTTPBasicAuth

PACKAGES = {
    'minimal':      {'name': 'Минимальный пакет',     'amount': '5000.00',  'description': 'Продвижение: минимум 10 000 прослушиваний'},
    'medium':       {'name': 'Средний пакет',          'amount': '10000.00', 'description': 'Продвижение: минимум 30 000 прослушиваний'},
    'confident':    {'name': 'Уверенный пакет',        'amount': '15000.00', 'description': 'Продвижение: минимум 50 000 прослушиваний'},
    'professional': {'name': 'Профессиональный пакет', 'amount': '20000.00', 'description': 'Продвижение: от 100 000 прослушиваний'},
}

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    path = event.get('path', '/')
    schema = os.environ.get('MAIN_DB_SCHEMA') or 't_p40522734_quantum_analytics_ed'

    # Оплата пакета продвижения (публичный, без БД)
    if (action == 'paypkg' or path.endswith('/pay-package') or path.endswith('/paypkg')) and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        package_id = body.get('package')
        customer_name = body.get('name', '').strip()
        customer_contact = body.get('contact', '').strip()
        track_name = body.get('track', '').strip()
        return_url = body.get('return_url', 'https://kalashnikov-sound.ru/')
        if package_id not in PACKAGES:
            return json_response(400, {'error': 'Неверный пакет'})
        if not customer_name or not customer_contact:
            return json_response(400, {'error': 'Укажите имя и контакт'})
        pkg = PACKAGES[package_id]
        shop_id = os.environ['YOOKASSA_SHOP_ID']
        secret_key = os.environ['YOOKASSA_SECRET_KEY']
        desc = f"{pkg['description']}. Артист: {customer_name}" + (f", трек: {track_name}" if track_name else "")
        resp = requests.post(
            'https://api.yookassa.ru/v3/payments',
            json={
                'amount': {'value': pkg['amount'], 'currency': 'RUB'},
                'confirmation': {'type': 'redirect', 'return_url': return_url},
                'capture': True,
                'description': desc,
                'metadata': {'package': package_id, 'customer_name': customer_name, 'customer_contact': customer_contact},
            },
            auth=HTTPBasicAuth(shop_id, secret_key),
            headers={'Idempotence-Key': str(uuid.uuid4())},
            timeout=15,
        )
        data = resp.json()
        print(f"[pay-package] status={resp.status_code} data={data}")
        if resp.status_code not in (200, 201):
            return json_response(500, {'error': data.get('description', f'Ошибка ЮКасса (код {resp.status_code})')})
        payment_url = data.get('confirmation', {}).get('confirmation_url')
        if not payment_url:
            return json_response(500, {'error': 'ЮКасса не вернула ссылку на оплату'})
        return json_response(200, {'payment_url': payment_url})

    conn = get_conn()
    cur = conn.cursor()

    # Трекинг посещения сайта (публичный, без авторизации)
    if path.endswith('/visit') and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        page = body.get('page', '/')[:255]
        session_id = body.get('session_id', '')[:64]
        user_agent = event.get('headers', {}).get('User-Agent', '')[:500]
        try:
            cur.execute(f"INSERT INTO {schema}.site_visits (page, session_id, user_agent) VALUES (%s, %s, %s)", (page, session_id, user_agent))
            conn.commit()
        except Exception:
            pass
        return json_response(200, {'ok': True})

    # Статистика посещаемости (только admin)
    if path.endswith('/visits') and method == 'GET':
        visit_user = get_user(cur, token, schema)
        if not visit_user or visit_user[1] != 'admin':
            return json_response(403, {'error': 'Доступ запрещён'})
        cur.execute(f"SELECT COUNT(*) FROM {schema}.site_visits WHERE visited_at > NOW() - INTERVAL '1 hour'")
        online = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {schema}.site_visits WHERE visited_at::date = CURRENT_DATE")
        today = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {schema}.site_visits WHERE visited_at > NOW() - INTERVAL '7 days'")
        week = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {schema}.site_visits WHERE visited_at > NOW() - INTERVAL '30 days'")
        month = cur.fetchone()[0]
        cur.execute(f"SELECT page, COUNT(*) as cnt FROM {schema}.site_visits WHERE visited_at > NOW() - INTERVAL '7 days' GROUP BY page ORDER BY cnt DESC LIMIT 10")
        top_pages = [{'page': r[0], 'visits': r[1]} for r in cur.fetchall()]
        cur.execute(f"SELECT DATE(visited_at) as day, COUNT(*) as cnt FROM {schema}.site_visits WHERE visited_at > NOW() - INTERVAL '14 days' GROUP BY day ORDER BY day ASC")
        daily = [{'date': str(r[0]), 'visits': r[1]} for r in cur.fetchall()]
        return json_response(200, {'online': online, 'today': today, 'week': week, 'month': month, 'top_pages': top_pages, 'daily': daily})

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

    # Статистика прослушиваний (для артиста — своя, для admin — по user_id)
    if path.endswith('/statistics') and method == 'GET':
        user = get_user(cur, token, schema)
        if not user:
            return json_response(401, {'error': 'Не авторизован'})
        params = event.get('queryStringParameters') or {}
        target_user_id = params.get('user_id') if user[1] == 'admin' else user[0]
        if not target_user_id:
            return json_response(400, {'error': 'Укажите артиста'})
        cur.execute(f'SELECT id, platform, track_title, streams, period, notes, created_at FROM {schema}.statistics WHERE user_id = %s ORDER BY created_at DESC', (target_user_id,))
        rows = cur.fetchall()
        stats = [{'id': r[0], 'platform': r[1], 'track_title': r[2], 'streams': r[3], 'period': r[4], 'notes': r[5], 'created_at': str(r[6])} for r in rows]
        return json_response(200, {'statistics': stats})

    # Заявка на дистрибьюцию от артиста (POST — любой авторизованный)
    if path.endswith('/distribution') and method == 'POST':
        artist_user = get_user(cur, token, schema)
        if not artist_user:
            return json_response(401, {'error': 'Не авторизован'})
        body = json.loads(event.get('body') or '{}')
        release_id = body.get('release_id') or None
        platforms = body.get('platforms', '').strip()
        message = body.get('message', '').strip()
        cur.execute(
            f"INSERT INTO {schema}.distribution_requests (user_id, release_id, platforms, message) VALUES (%s, %s, %s, %s) RETURNING id, created_at",
            (artist_user[0], release_id, platforms, message)
        )
        row = cur.fetchone()
        conn.commit()
        return json_response(200, {'request': {'id': row[0], 'status': 'new', 'platforms': platforms, 'message': message, 'created_at': str(row[1])}})

    # Релизы артиста для личного кабинета (GET, авторизованный)
    if path.endswith('/my-releases') and method == 'GET':
        artist_user = get_user(cur, token, schema)
        if not artist_user:
            return json_response(401, {'error': 'Не авторизован'})
        cur.execute(f"SELECT id, title, artist_name, upc, cover_url, status, genre, release_date, notes, created_at FROM {schema}.releases WHERE user_id = %s ORDER BY created_at DESC", (artist_user[0],))
        rows = cur.fetchall()
        releases = [{'id': r[0], 'title': r[1], 'artist_name': r[2], 'upc': r[3], 'cover_url': r[4], 'status': r[5], 'genre': r[6], 'release_date': str(r[7]) if r[7] else None, 'notes': r[8], 'created_at': str(r[9])} for r in rows]
        return json_response(200, {'releases': releases})

    # Мои заявки на дистрибьюцию (личный кабинет)
    if path.endswith('/my-distribution') and method == 'GET':
        artist_user = get_user(cur, token, schema)
        if not artist_user:
            return json_response(401, {'error': 'Не авторизован'})
        cur.execute(f"SELECT id, release_id, platforms, message, status, created_at FROM {schema}.distribution_requests WHERE user_id = %s ORDER BY created_at DESC", (artist_user[0],))
        rows = cur.fetchall()
        items = [{'id': r[0], 'release_id': r[1], 'platforms': r[2], 'message': r[3], 'status': r[4], 'created_at': str(r[5])} for r in rows]
        return json_response(200, {'requests': items})

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

    # Создать аккаунт артиста (только admin)
    if path.endswith('/create-user') and method == 'POST':
        import hashlib, secrets as sec
        body = json.loads(event.get('body') or '{}')
        email = body.get('email', '').strip().lower()
        artist_name = body.get('artist_name', '').strip()
        password = body.get('password', '').strip()
        if not email or not artist_name or not password:
            return json_response(400, {'error': 'Укажите email, имя и пароль'})
        cur.execute(f"SELECT id FROM {schema}.users WHERE email = %s", (email,))
        if cur.fetchone():
            return json_response(400, {'error': 'Пользователь с таким email уже существует'})
        pwd_hash = hashlib.sha256(password.encode()).hexdigest()
        cur.execute(f"INSERT INTO {schema}.users (email, password_hash, artist_name, role) VALUES (%s, %s, %s, 'artist') RETURNING id, created_at", (email, pwd_hash, artist_name))
        row = cur.fetchone()
        conn.commit()
        return json_response(200, {'user': {'id': row[0], 'email': email, 'artist_name': artist_name, 'created_at': str(row[1])}})

    # Релизы артиста (GET)
    if path.endswith('/releases') and method == 'GET':
        params = event.get('queryStringParameters') or {}
        target_user_id = params.get('user_id')
        if target_user_id:
            cur.execute(f"SELECT id, title, artist_name, upc, cover_url, status, genre, release_date, notes, created_at FROM {schema}.releases WHERE user_id = %s ORDER BY created_at DESC", (target_user_id,))
        else:
            cur.execute(f"SELECT id, title, artist_name, upc, cover_url, status, genre, release_date, notes, created_at FROM {schema}.releases ORDER BY created_at DESC")
        rows = cur.fetchall()
        releases = [{'id': r[0], 'title': r[1], 'artist_name': r[2], 'upc': r[3], 'cover_url': r[4], 'status': r[5], 'genre': r[6], 'release_date': str(r[7]) if r[7] else None, 'notes': r[8], 'created_at': str(r[9])} for r in rows]
        return json_response(200, {'releases': releases})

    # Создать релиз (admin)
    if path.endswith('/releases') and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        target_user_id = body.get('user_id')
        title = body.get('title', '').strip()
        artist_name = body.get('artist_name', '').strip()
        upc = body.get('upc', '').strip() or None
        cover_url = body.get('cover_url', '').strip() or None
        status = body.get('status', 'moderation')
        genre = body.get('genre', '').strip() or None
        release_date = body.get('release_date') or None
        notes = body.get('notes', '').strip() or None
        if not target_user_id or not title:
            return json_response(400, {'error': 'Укажите артиста и название'})
        cur.execute(
            f"INSERT INTO {schema}.releases (user_id, title, artist_name, upc, cover_url, status, genre, release_date, notes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id, created_at",
            (target_user_id, title, artist_name, upc, cover_url, status, genre, release_date, notes)
        )
        row = cur.fetchone()
        conn.commit()
        return json_response(200, {'release': {'id': row[0], 'title': title, 'artist_name': artist_name, 'upc': upc, 'cover_url': cover_url, 'status': status, 'genre': genre, 'release_date': release_date, 'notes': notes, 'created_at': str(row[1])}})

    # Обновить релиз (admin)
    if path.endswith('/releases/update') and method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        release_id = body.get('id')
        if not release_id:
            return json_response(400, {'error': 'Укажите id'})
        fields = {k: body[k] for k in ('title', 'artist_name', 'upc', 'cover_url', 'status', 'genre', 'release_date', 'notes') if k in body}
        if not fields:
            return json_response(400, {'error': 'Нечего обновлять'})
        set_parts = ', '.join([f"{k} = %s" for k in fields])
        values = list(fields.values()) + [release_id]
        cur.execute(f"UPDATE {schema}.releases SET {set_parts}, updated_at = NOW() WHERE id = %s", values)
        conn.commit()
        return json_response(200, {'ok': True})

    # Добавить запись статистики (только admin)
    if path.endswith('/statistics') and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        target_user_id = body.get('user_id')
        platform = body.get('platform', '').strip()
        track_title = body.get('track_title', '').strip()
        streams = body.get('streams', 0)
        period = body.get('period', '').strip()
        notes = body.get('notes', '')
        if not target_user_id or not platform or not track_title:
            return json_response(400, {'error': 'Заполните все поля'})
        cur.execute(
            f'INSERT INTO {schema}.statistics (user_id, platform, track_title, streams, period, notes) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, created_at',
            (target_user_id, platform, track_title, int(streams), period, notes)
        )
        row = cur.fetchone()
        conn.commit()
        return json_response(200, {'stat': {'id': row[0], 'platform': platform, 'track_title': track_title, 'streams': int(streams), 'period': period, 'notes': notes, 'created_at': str(row[1])}})

    # Удалить запись статистики (только admin)
    if path.endswith('/statistics/delete') and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        stat_id = body.get('id')
        if not stat_id:
            return json_response(400, {'error': 'Укажите id'})
        cur.execute(f'UPDATE {schema}.statistics SET updated_at = NOW() WHERE id = %s RETURNING id', (stat_id,))
        conn.commit()
        return json_response(200, {'ok': True})

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

    # Заявки на дистрибьюцию (admin — все, артист — свои)
    if path.endswith('/distribution') and method == 'GET':
        params = event.get('queryStringParameters') or {}
        target_user_id = params.get('user_id')
        if target_user_id:
            cur.execute(f"SELECT id, user_id, release_id, platforms, message, status, created_at FROM {schema}.distribution_requests WHERE user_id = %s ORDER BY created_at DESC", (target_user_id,))
        else:
            cur.execute(f"SELECT id, user_id, release_id, platforms, message, status, created_at FROM {schema}.distribution_requests ORDER BY created_at DESC")
        rows = cur.fetchall()
        items = [{'id': r[0], 'user_id': r[1], 'release_id': r[2], 'platforms': r[3], 'message': r[4], 'status': r[5], 'created_at': str(r[6])} for r in rows]
        return json_response(200, {'requests': items})

    # Обновить статус заявки (admin)
    if path.endswith('/distribution/update') and method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        req_id = body.get('id')
        status = body.get('status')
        if not req_id or not status:
            return json_response(400, {'error': 'Укажите id и статус'})
        cur.execute(f"UPDATE {schema}.distribution_requests SET status = %s WHERE id = %s", (status, req_id))
        conn.commit()
        return json_response(200, {'ok': True})

    return json_response(404, {'error': 'Not found'})