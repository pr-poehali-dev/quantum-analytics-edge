"""
Административные функции: артисты, контракты, треки, платежи ЮКасса, статистика, посещаемость, релизы, дистрибьюция.
Роутинг через ?action= параметр. v2
"""
import json
import os
import uuid
import hashlib
import base64
import boto3
import psycopg2
import requests
from datetime import datetime
from requests.auth import HTTPBasicAuth

TELEGRAM_CHAT_ID = "6162140923"

def send_telegram(token: str, message: str) -> bool:
    try:
        resp = requests.post(
            f'https://api.telegram.org/bot{token}/sendMessage',
            json={'chat_id': TELEGRAM_CHAT_ID, 'text': message, 'parse_mode': 'Markdown'},
            timeout=10,
        )
        return resp.ok
    except Exception as e:
        print(f'[TG ERROR] {e}')
        return False

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

    # Создать релиз (артист или admin)
    if action == 'releases' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u:
            return err(401, 'Не авторизован')
        body = json.loads(event.get('body') or '{}')
        uid = body.get('user_id') if u[1] == 'admin' else u[0]
        title = body.get('title', '').strip()
        if not uid or not title:
            return err(400, 'Укажите название')
        status = body.get('status', 'moderation') if u[1] == 'admin' else 'moderation'
        cur.execute(
            f"INSERT INTO {schema}.releases (user_id, title, artist_name, upc, cover_url, status, genre, release_date, notes, type, label) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id, created_at",
            (uid, title, body.get('artist_name'), body.get('upc') or None, body.get('cover_url') or None, status, body.get('genre') or None, body.get('release_date') or None, body.get('notes') or None, body.get('type') or None, body.get('label') or None)
        )
        row = cur.fetchone()
        conn.commit()
        rel = {'id': row[0], 'title': title, 'artist_name': body.get('artist_name'), 'upc': body.get('upc') or None, 'cover_url': body.get('cover_url') or None, 'status': status, 'genre': body.get('genre') or None, 'release_date': body.get('release_date') or None, 'notes': body.get('notes') or None, 'created_at': str(row[1])}

        tg_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
        if tg_token and u[1] != 'admin':
            cur.execute(f"SELECT email, artist_name FROM {schema}.users WHERE id = %s", (uid,))
            uinfo = cur.fetchone()
            aname = uinfo[1] if uinfo else 'Неизвестный'
            aemail = uinfo[0] if uinfo else ''
            tg_msg = (
                f"🎶 *Новый релиз на модерацию*\n\n"
                f"*Артист:* {aname}\n"
                f"*Email:* {aemail}\n"
                f"*Название:* {title}\n"
                f"*Жанр:* {body.get('genre') or '—'}\n"
                f"*Дата выхода:* {body.get('release_date') or '—'}\n"
                f"_Релиз #{row[0]}_"
            )
            send_telegram(tg_token, tg_msg)

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

    # Загрузка обложки релиза в S3 (авторизованный пользователь)
    if action == 'upload-cover' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u:
            return err(401, 'Не авторизован')
        body = json.loads(event.get('body') or '{}')
        file_data = body.get('file_data', '')
        file_name = body.get('file_name', 'cover.jpg')
        release_id_cover = body.get('release_id')
        if not file_data:
            return err(400, 'Нет файла')
        file_bytes = base64.b64decode(file_data)
        ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else 'jpg'
        content_type = 'image/jpeg' if ext in ('jpg', 'jpeg') else f'image/{ext}'
        key = f'covers/{datetime.now().strftime("%Y%m%d%H%M%S")}_{file_name}'
        s3 = boto3.client('s3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
        )
        s3.put_object(Bucket='files', Key=key, Body=file_bytes, ContentType=content_type)
        cover_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        if release_id_cover:
            cur.execute(f"UPDATE {schema}.releases SET cover_url = %s WHERE id = %s", (cover_url, release_id_cover))
            conn.commit()
        return ok({'cover_url': cover_url})

    # Заявка на дистрибьюцию (артист — POST)
    if action == 'distribution' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u:
            return err(401, 'Не авторизован')
        body = json.loads(event.get('body') or '{}')
        lyrics = body.get('lyrics', '') or ''
        copyright_text = body.get('copyright', '') or ''

        audio_url = None
        audio_file_data = body.get('audio_file_data')
        audio_file_name = body.get('audio_file_name', 'audio.mp3')
        if audio_file_data:
            audio_bytes = base64.b64decode(audio_file_data)
            ext = audio_file_name.rsplit('.', 1)[-1].lower() if '.' in audio_file_name else 'mp3'
            audio_key = f'dist-audio/{datetime.now().strftime("%Y%m%d%H%M%S")}_{u[0]}_{audio_file_name}'
            s3 = boto3.client('s3',
                endpoint_url='https://bucket.poehali.dev',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
            )
            s3.put_object(Bucket='files', Key=audio_key, Body=audio_bytes, ContentType=f'audio/{ext}')
            audio_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{audio_key}"

        cur.execute(
            f"INSERT INTO {schema}.distribution_requests (user_id, release_id, platforms, message, lyrics, copyright, audio_url) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id, created_at",
            (u[0], body.get('release_id') or None, body.get('platforms', ''), body.get('message', ''), lyrics, copyright_text, audio_url)
        )
        row = cur.fetchone()
        conn.commit()

        cur.execute(f"SELECT email, artist_name FROM {schema}.users WHERE id = %s", (u[0],))
        uinfo = cur.fetchone()
        artist_email = uinfo[0] if uinfo else ''
        artist_name = uinfo[1] if uinfo else 'Неизвестный'
        platforms = body.get('platforms', '')
        message = body.get('message', '')

        tg_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
        if tg_token:
            lyrics_preview = (lyrics[:100] + '...') if len(lyrics) > 100 else (lyrics or '—')
            tg_msg = (
                f"🎵 *Новая заявка на дистрибьюцию*\n\n"
                f"*Артист:* {artist_name}\n"
                f"*Email:* {artist_email}\n"
                f"*Платформы:* {platforms or 'не указаны'}\n"
                f"*Копирайт:* {copyright_text or '—'}\n"
                f"*Текст:* {lyrics_preview}\n"
                f"*Сообщение:* {message or '—'}\n"
                f"_Заявка #{row[0]}_"
            )
            send_telegram(tg_token, tg_msg)

        return ok({'request': {'id': row[0], 'status': 'new', 'platforms': platforms, 'message': message, 'lyrics': lyrics, 'copyright': copyright_text, 'audio_url': audio_url, 'created_at': str(row[1])}})

    # Список заявок на дистрибьюцию (admin или свои)
    if action == 'distribution' and method == 'GET':
        u = get_user(cur, token, schema)
        if not u:
            return err(401, 'Не авторизован')
        uid = params.get('user_id') if u[1] == 'admin' else u[0]
        if uid:
            cur.execute(f"SELECT id, user_id, release_id, platforms, message, status, created_at, lyrics, copyright, audio_url FROM {schema}.distribution_requests WHERE user_id = %s ORDER BY created_at DESC", (uid,))
        else:
            cur.execute(f"SELECT id, user_id, release_id, platforms, message, status, created_at, lyrics, copyright, audio_url FROM {schema}.distribution_requests ORDER BY created_at DESC")
        items = [{'id': r[0], 'user_id': r[1], 'release_id': r[2], 'platforms': r[3], 'message': r[4], 'status': r[5], 'created_at': str(r[6]), 'lyrics': r[7], 'copyright': r[8], 'audio_url': r[9]} for r in cur.fetchall()]
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

    # === РОЯЛТИ ===

    # Список роялти (артист — свои, admin — по user_id)
    if action == 'royalties' and method == 'GET':
        u = get_user(cur, token, schema)
        if not u:
            return err(401, 'Не авторизован')
        uid = params.get('user_id') if u[1] == 'admin' else u[0]
        if not uid:
            return err(400, 'Укажите артиста')
        cur.execute(f"SELECT id, user_id, period, platform, track_title, amount, currency, notes, created_at FROM {schema}.royalties WHERE user_id = %s ORDER BY created_at DESC", (uid,))
        items = [{'id': r[0], 'user_id': r[1], 'period': r[2], 'platform': r[3], 'track_title': r[4], 'amount': str(r[5]), 'currency': r[6], 'notes': r[7], 'created_at': str(r[8])} for r in cur.fetchall()]
        total = sum(float(i['amount']) for i in items)
        return ok({'royalties': items, 'total': round(total, 2)})

    # Добавить роялти (admin)
    if action == 'royalties' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        uid = body.get('user_id')
        period = body.get('period', '').strip()
        platform = body.get('platform', '').strip()
        track_title = body.get('track_title', '').strip()
        amount = body.get('amount', 0)
        currency = body.get('currency', 'RUB')
        notes = body.get('notes', '') or ''
        if not uid or not period or not platform or not track_title:
            return err(400, 'Заполните все обязательные поля')
        cur.execute(
            f"INSERT INTO {schema}.royalties (user_id, period, platform, track_title, amount, currency, notes) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id, created_at",
            (uid, period, platform, track_title, float(amount), currency, notes)
        )
        row = cur.fetchone()
        conn.commit()
        return ok({'royalty': {'id': row[0], 'user_id': uid, 'period': period, 'platform': platform, 'track_title': track_title, 'amount': str(amount), 'currency': currency, 'notes': notes, 'created_at': str(row[1])}})

    # Удалить роялти (admin)
    if action == 'del-royalty' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        cur.execute(f"DELETE FROM {schema}.royalties WHERE id = %s", (body.get('id'),))
        conn.commit()
        return ok({'ok': True})

    # Смена пароля пользователя (admin)
    if action == 'change-password' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        user_id = body.get('user_id')
        new_password = body.get('new_password', '').strip()
        if not user_id or not new_password:
            return err(400, 'Укажите пользователя и новый пароль')
        if len(new_password) < 6:
            return err(400, 'Пароль минимум 6 символов')
        pw_hash = hashlib.sha256(new_password.encode()).hexdigest()
        cur.execute(f"UPDATE {schema}.users SET password_hash = %s WHERE id = %s AND role = 'artist'", (pw_hash, user_id))
        conn.commit()
        return ok({'ok': True})

    # Редактирование трека (admin)
    if action == 'update-track' and method == 'PUT':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        track_id = body.get('id')
        if not track_id:
            return err(400, 'Укажите id трека')
        fields = {}
        if 'title' in body: fields['title'] = body['title']
        if 'status' in body: fields['status'] = body['status']
        if 'notes' in body: fields['notes'] = body['notes']
        if not fields:
            return err(400, 'Нечего обновлять')
        set_sql = ', '.join(f"{k} = %s" for k in fields)
        cur.execute(f"UPDATE {schema}.tracks SET {set_sql} WHERE id = %s", list(fields.values()) + [track_id])
        conn.commit()
        return ok({'ok': True})

    # Лайки треков на радио (публичное)
    if action == 'radio-like' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        artist_name = body.get('artist_name', '').strip()[:100]
        session_id = body.get('session_id', '').strip()[:64]
        if not artist_name or not session_id:
            return err(400, 'Укажите артиста и session_id')
        try:
            cur.execute(f"INSERT INTO {schema}.radio_likes (artist_name, session_id) VALUES (%s, %s) ON CONFLICT (artist_name, session_id) DO NOTHING", (artist_name, session_id))
            conn.commit()
        except Exception:
            pass
        cur.execute(f"SELECT COUNT(*) FROM {schema}.radio_likes WHERE artist_name = %s", (artist_name,))
        count = cur.fetchone()[0]
        return ok({'likes': count, 'artist_name': artist_name})

    # Убрать лайк
    if action == 'radio-unlike' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        artist_name = body.get('artist_name', '').strip()[:100]
        session_id = body.get('session_id', '').strip()[:64]
        try:
            cur.execute(f"DELETE FROM {schema}.radio_likes WHERE artist_name = %s AND session_id = %s", (artist_name, session_id))
            conn.commit()
        except Exception:
            pass
        cur.execute(f"SELECT COUNT(*) FROM {schema}.radio_likes WHERE artist_name = %s", (artist_name,))
        count = cur.fetchone()[0]
        return ok({'likes': count, 'artist_name': artist_name})

    # Топ лайков (публичное)
    if action == 'radio-top' and method == 'GET':
        session_id = params.get('session_id', '')
        cur.execute(f"""
            SELECT artist_name, COUNT(*) as likes
            FROM {schema}.radio_likes
            WHERE liked_at > NOW() - INTERVAL '30 days'
            GROUP BY artist_name ORDER BY likes DESC LIMIT 3
        """)
        top = [{'artist_name': r[0], 'likes': r[1]} for r in cur.fetchall()]
        cur.execute(f"""
            SELECT artist_name, COUNT(*) as total_likes,
                   EXISTS(SELECT 1 FROM {schema}.radio_likes WHERE artist_name = rl.artist_name AND session_id = %s) as liked
            FROM {schema}.radio_likes rl
            GROUP BY artist_name
        """, (session_id,))
        all_likes = {r[0]: {'total': r[1], 'liked': r[2]} for r in cur.fetchall()}
        return ok({'top': top, 'all_likes': all_likes})

    # Список документов (admin — все или по user_id; artist — свои)
    if action == 'documents' and method == 'GET':
        u = get_user(cur, token, schema)
        if not u:
            return err(401, 'Не авторизован')
        if u[1] == 'admin':
            uid = params.get('user_id')
            if uid:
                cur.execute(f"""
                    SELECT d.id, d.title, d.description, d.file_url, d.file_name, d.file_size, d.created_at,
                           uploader.artist_name as uploader
                    FROM {schema}.documents d
                    JOIN {schema}.users uploader ON uploader.id = d.uploaded_by
                    WHERE d.user_id = %s ORDER BY d.created_at DESC
                """, (int(uid),))
            else:
                cur.execute(f"""
                    SELECT d.id, d.title, d.description, d.file_url, d.file_name, d.file_size, d.created_at,
                           uploader.artist_name as uploader
                    FROM {schema}.documents d
                    JOIN {schema}.users uploader ON uploader.id = d.uploaded_by
                    ORDER BY d.created_at DESC
                """)
        else:
            cur.execute(f"""
                SELECT d.id, d.title, d.description, d.file_url, d.file_name, d.file_size, d.created_at,
                       uploader.artist_name as uploader
                FROM {schema}.documents d
                JOIN {schema}.users uploader ON uploader.id = d.uploaded_by
                WHERE d.user_id = %s ORDER BY d.created_at DESC
            """, (u[0],))
        rows = cur.fetchall()
        docs = [{'id': r[0], 'title': r[1], 'description': r[2], 'file_url': r[3],
                 'file_name': r[4], 'file_size': r[5], 'created_at': str(r[6]), 'uploader': r[7]}
                for r in rows]
        return ok({'documents': docs})

    # Загрузить документ (только admin)
    if action == 'upload-document' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        target_uid = body.get('user_id')
        title = str(body.get('title', '')).strip()
        description = str(body.get('description', '')).strip()
        file_data = body.get('file_data', '')
        file_name = str(body.get('file_name', 'document')).strip()
        if not target_uid or not title or not file_data:
            return err(400, 'Укажите user_id, title и file_data')
        file_bytes = base64.b64decode(file_data)
        file_size = len(file_bytes)
        ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else 'pdf'
        key = f'documents/{uuid.uuid4()}.{ext}'
        content_types = {
            'pdf': 'application/pdf', 'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
        }
        s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                          aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                          aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
        s3.put_object(Bucket='files', Key=key, Body=file_bytes,
                      ContentType=content_types.get(ext, 'application/octet-stream'))
        file_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        cur.execute(f"""
            INSERT INTO {schema}.documents (user_id, title, description, file_url, file_name, file_size, uploaded_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, created_at
        """, (int(target_uid), title, description or None, file_url, file_name, file_size, u[0]))
        row = cur.fetchone()
        conn.commit()
        return ok({'document': {'id': row[0], 'title': title, 'description': description,
                                'file_url': file_url, 'file_name': file_name,
                                'file_size': file_size, 'created_at': str(row[1])}})

    # Удалить документ (только admin)
    if action == 'del-document' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        cur.execute(f"DELETE FROM {schema}.documents WHERE id = %s", (body.get('id'),))
        conn.commit()
        return ok({'ok': True})

    # Получить смарт-линк по release_id (admin)
    if action == 'smart-link' and method == 'GET':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        release_id = params.get('release_id')
        if not release_id:
            return err(400, 'Укажите release_id')
        cur.execute(f"SELECT id, release_id, slug, title, artist_name, cover_url, description, links, active FROM {schema}.smart_links WHERE release_id = %s", (release_id,))
        row = cur.fetchone()
        if not row:
            return ok({'smart_link': None})
        return ok({'smart_link': {'id': row[0], 'release_id': row[1], 'slug': row[2], 'title': row[3], 'artist_name': row[4], 'cover_url': row[5], 'description': row[6], 'links': row[7] if row[7] else [], 'active': row[8]}})

    # Создать или обновить смарт-линк (admin)
    if action == 'smart-link' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        release_id = body.get('release_id')
        slug = body.get('slug', '').strip().lower().replace(' ', '-')
        title = body.get('title', '').strip()
        if not release_id or not slug or not title:
            return err(400, 'Укажите release_id, slug и title')
        links_json = json.dumps(body.get('links', []), ensure_ascii=False)
        cur.execute(f"SELECT id FROM {schema}.smart_links WHERE release_id = %s", (release_id,))
        existing = cur.fetchone()
        if existing:
            cur.execute(
                f"UPDATE {schema}.smart_links SET slug=%s, title=%s, artist_name=%s, cover_url=%s, description=%s, links=%s, active=%s, updated_at=NOW() WHERE release_id=%s",
                (slug, title, body.get('artist_name'), body.get('cover_url'), body.get('description'), links_json, body.get('active', True), release_id)
            )
            conn.commit()
            return ok({'ok': True, 'slug': slug})
        else:
            cur.execute(
                f"INSERT INTO {schema}.smart_links (release_id, slug, title, artist_name, cover_url, description, links, active) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (release_id, slug, title, body.get('artist_name'), body.get('cover_url'), body.get('description'), links_json, body.get('active', True))
            )
            conn.commit()
            return ok({'ok': True, 'slug': slug})

    # === RADIO TRACKS (управление плейлистом радио) ===

    # Список треков радио (публичный)
    if action == 'radio-tracks' and method == 'GET':
        cur.execute(f"SELECT id, title, artist, file_url, file_name, file_size, sort_order, is_active, created_at FROM {schema}.radio_tracks WHERE is_active = TRUE ORDER BY sort_order ASC, created_at ASC")
        items = [{'id': r[0], 'title': r[1], 'artist': r[2], 'file_url': r[3], 'file_name': r[4], 'file_size': r[5], 'sort_order': r[6], 'is_active': r[7], 'created_at': str(r[8])} for r in cur.fetchall()]
        return ok({'tracks': items})

    # Все треки радио включая неактивные (только admin)
    if action == 'radio-tracks-all' and method == 'GET':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        cur.execute(f"SELECT id, title, artist, file_url, file_name, file_size, sort_order, is_active, created_at FROM {schema}.radio_tracks ORDER BY sort_order ASC, created_at ASC")
        items = [{'id': r[0], 'title': r[1], 'artist': r[2], 'file_url': r[3], 'file_name': r[4], 'file_size': r[5], 'sort_order': r[6], 'is_active': r[7], 'created_at': str(r[8])} for r in cur.fetchall()]
        return ok({'tracks': items})

    # Загрузить трек радио (только admin)
    if action == 'upload-radio-track' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        title = str(body.get('title', '')).strip()
        artist = str(body.get('artist', '')).strip()
        file_data = body.get('file_data', '')
        file_name = str(body.get('file_name', 'track.mp3')).strip()
        sort_order = int(body.get('sort_order', 0))
        if not title or not file_data:
            return err(400, 'Укажите название и файл')
        file_bytes = base64.b64decode(file_data)
        file_size = len(file_bytes)
        ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else 'mp3'
        audio_types = {'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'flac': 'audio/flac', 'm4a': 'audio/mp4', 'aac': 'audio/aac', 'ogg': 'audio/ogg'}
        key = f'radio/{uuid.uuid4()}.{ext}'
        s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                          aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                          aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
        s3.put_object(Bucket='files', Key=key, Body=file_bytes, ContentType=audio_types.get(ext, 'audio/mpeg'))
        file_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        cur.execute(f"INSERT INTO {schema}.radio_tracks (title, artist, file_url, file_name, file_size, sort_order) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id, created_at",
                    (title, artist or None, file_url, file_name, file_size, sort_order))
        row = cur.fetchone()
        conn.commit()
        return ok({'track': {'id': row[0], 'title': title, 'artist': artist, 'file_url': file_url, 'file_name': file_name, 'file_size': file_size, 'sort_order': sort_order, 'is_active': True, 'created_at': str(row[1])}})

    # Обновить трек радио (только admin)
    if action == 'update-radio-track' and method == 'PUT':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        track_id = body.get('id')
        if not track_id:
            return err(400, 'Укажите id')
        fields = {}
        if 'title' in body: fields['title'] = body['title']
        if 'artist' in body: fields['artist'] = body['artist']
        if 'sort_order' in body: fields['sort_order'] = int(body['sort_order'])
        if 'is_active' in body: fields['is_active'] = bool(body['is_active'])
        if not fields:
            return err(400, 'Нечего обновлять')
        set_sql = ', '.join(f"{k} = %s" for k in fields)
        cur.execute(f"UPDATE {schema}.radio_tracks SET {set_sql} WHERE id = %s", list(fields.values()) + [track_id])
        conn.commit()
        return ok({'ok': True})

    # Удалить трек радио (только admin)
    if action == 'del-radio-track' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u or u[1] != 'admin':
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        cur.execute(f"DELETE FROM {schema}.radio_tracks WHERE id = %s", (body.get('id'),))
        conn.commit()
        return ok({'ok': True})

    # === RADIO ARTISTS (артисты на странице радио) ===

    # Список артистов для Radio страницы (публичный)
    if action == 'radio-artists' and method == 'GET':
        cur.execute(f"SELECT id, name, url, photo_url, sort_order, is_visible, description, instagram_url, vk_url FROM {schema}.label_artists WHERE is_visible = TRUE ORDER BY sort_order ASC, name ASC")
        items = [{'id': r[0], 'name': r[1], 'url': r[2], 'photo_url': r[3], 'sort_order': r[4], 'is_visible': r[5], 'description': r[6], 'instagram_url': r[7], 'vk_url': r[8]} for r in cur.fetchall()]
        return ok({'artists': items})

    return err(404, 'Not found')