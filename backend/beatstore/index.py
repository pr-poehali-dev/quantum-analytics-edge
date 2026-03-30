"""
BeatStore KS LABEL: загрузка битов, просмотр, новинки лейбла, артисты.
Публичные: list-beats, get-beat, play-beat, list-label-releases, list-artists.
Админ: add-label-release, update-label-release, del-label-release, del-beat, admin-artists, add-artist, update-artist, del-artist.
"""
import json
import os
import uuid
import base64
import boto3
import psycopg2

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

def get_schema():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT current_schema()")
    schema = cur.fetchone()[0]
    cur.close()
    conn.close()
    return schema

def get_admin(cur, token, schema):
    cur.execute(f"SELECT u.id, u.role FROM {schema}.sessions s JOIN {schema}.users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW()", (token,))
    row = cur.fetchone()
    if row and row[1] == 'admin':
        return row[0]
    return None

def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )

def handler(event: dict, context) -> dict:
    """BeatStore и Новинки лейбла. Роутинг через ?action="""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', '')
    method = event.get('httpMethod', 'GET')
    token = (event.get('headers') or {}).get('X-Session-Token', '')

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT current_schema()")
    schema = cur.fetchone()[0]

    # ─── ПУБЛИЧНЫЙ: список битов ───────────────────────────────────────────
    if action == 'list-beats' and method == 'GET':
        genre = qs.get('genre', '')
        search = qs.get('search', '')
        limit = int(qs.get('limit', '50'))
        offset = int(qs.get('offset', '0'))
        filters = ["status = 'active'"]
        params = []
        if genre:
            filters.append("genre = %s")
            params.append(genre)
        if search:
            filters.append("(title ILIKE %s OR tags ILIKE %s)")
            params.extend([f'%{search}%', f'%{search}%'])
        where = 'WHERE ' + ' AND '.join(filters)
        cur.execute(f"""
            SELECT id, title, genre, bpm, price, currency, contact_telegram, contact_email,
                   file_url, file_name, file_size, cover_url, description, tags, plays, created_at, uploader_token
            FROM {schema}.beats {where}
            ORDER BY created_at DESC LIMIT %s OFFSET %s
        """, params + [limit, offset])
        rows = cur.fetchall()
        beats = []
        for r in rows:
            beats.append({
                'id': r[0], 'title': r[1], 'genre': r[2], 'bpm': r[3],
                'price': float(r[4]) if r[4] else None, 'currency': r[5],
                'contact_telegram': r[6], 'contact_email': r[7],
                'file_url': r[8], 'file_name': r[9], 'file_size': r[10],
                'cover_url': r[11], 'description': r[12], 'tags': r[13],
                'plays': r[14], 'created_at': str(r[15]),
                'is_owner': bool(token and r[16] and r[16] == token),
            })
        cur.close(); conn.close()
        return ok({'beats': beats})

    # ─── ПУБЛИЧНЫЙ: загрузить бит ───────────────────────────────────────────
    if action == 'upload-beat' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        title = str(body.get('title', '')).strip()
        genre = str(body.get('genre', '')).strip()
        bpm = body.get('bpm')
        price = body.get('price')
        currency = str(body.get('currency', 'RUB')).strip()
        contact_telegram = str(body.get('contact_telegram', '')).strip()
        contact_email = str(body.get('contact_email', '')).strip()
        description = str(body.get('description', '')).strip()
        tags = str(body.get('tags', '')).strip()
        file_data = body.get('file_data', '')
        file_name = str(body.get('file_name', 'beat.mp3')).strip()
        cover_data = body.get('cover_data', '')
        cover_name = str(body.get('cover_name', '')).strip()

        if not title or not file_data:
            cur.close(); conn.close()
            return err(400, 'Укажите название и аудиофайл')
        if not contact_telegram and not contact_email:
            cur.close(); conn.close()
            return err(400, 'Укажите Telegram или email для связи')

        s3 = get_s3()
        file_bytes = base64.b64decode(file_data)
        file_size = len(file_bytes)
        ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else 'mp3'
        key = f'beats/{uuid.uuid4()}.{ext}'
        audio_types = {'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'flac': 'audio/flac', 'ogg': 'audio/ogg'}
        s3.put_object(Bucket='files', Key=key, Body=file_bytes, ContentType=audio_types.get(ext, 'audio/mpeg'))
        file_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

        cover_url = None
        if cover_data:
            c_bytes = base64.b64decode(cover_data)
            c_ext = cover_name.rsplit('.', 1)[-1].lower() if '.' in cover_name else 'jpg'
            c_key = f'beats/covers/{uuid.uuid4()}.{c_ext}'
            img_types = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}
            s3.put_object(Bucket='files', Key=c_key, Body=c_bytes, ContentType=img_types.get(c_ext, 'image/jpeg'))
            cover_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{c_key}"

        uploader_token = token if token else None
        cur.execute(f"""
            INSERT INTO {schema}.beats (title, genre, bpm, price, currency, contact_telegram, contact_email,
                file_url, file_name, file_size, cover_url, description, tags, uploader_token)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (title, genre or None, bpm or None, price or None, currency,
              contact_telegram or None, contact_email or None,
              file_url, file_name, file_size, cover_url, description or None, tags or None, uploader_token))
        row = cur.fetchone()
        conn.commit()
        cur.close(); conn.close()
        return ok({'beat': {'id': row[0], 'title': title, 'file_url': file_url, 'created_at': str(row[1])}})

    # ─── ПУБЛИЧНЫЙ: счётчик прослушиваний ──────────────────────────────────
    if action == 'play-beat' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        beat_id = body.get('id')
        if beat_id:
            cur.execute(f"UPDATE {schema}.beats SET plays = plays + 1 WHERE id = %s", (beat_id,))
            conn.commit()
        cur.close(); conn.close()
        return ok({'ok': True})

    # ─── Удалить бит (админ или владелец по токену) ────────────────────────
    if action == 'del-beat' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        beat_id = body.get('id')
        admin_id = get_admin(cur, token, schema)
        if not admin_id:
            if not token:
                cur.close(); conn.close()
                return err(403, 'Доступ запрещён')
            cur.execute(f"SELECT uploader_token FROM {schema}.beats WHERE id = %s AND status = 'active'", (beat_id,))
            row = cur.fetchone()
            if not row or row[0] != token:
                cur.close(); conn.close()
                return err(403, 'Доступ запрещён')
        cur.execute(f"UPDATE {schema}.beats SET status = 'deleted' WHERE id = %s", (beat_id,))
        conn.commit()
        cur.close(); conn.close()
        return ok({'ok': True})

    # ─── ПУБЛИЧНЫЙ: список новинок лейбла ─────────────────────────────────
    if action == 'list-label-releases' and method == 'GET':
        cur.execute(f"""
            SELECT id, title, artist_name, description, cover_url, audio_url,
                   external_link, genre, release_date, is_published, created_at
            FROM {schema}.label_releases
            WHERE is_published = TRUE
            ORDER BY created_at DESC
        """)
        rows = cur.fetchall()
        releases = []
        for r in rows:
            releases.append({
                'id': r[0], 'title': r[1], 'artist_name': r[2], 'description': r[3],
                'cover_url': r[4], 'audio_url': r[5], 'external_link': r[6],
                'genre': r[7], 'release_date': str(r[8]) if r[8] else None,
                'is_published': r[9], 'created_at': str(r[10]),
            })
        cur.close(); conn.close()
        return ok({'releases': releases})

    # ─── АДМИН: все новинки (включая скрытые) ─────────────────────────────
    if action == 'admin-label-releases' and method == 'GET':
        admin_id = get_admin(cur, token, schema)
        if not admin_id:
            cur.close(); conn.close()
            return err(403, 'Доступ запрещён')
        cur.execute(f"""
            SELECT id, title, artist_name, description, cover_url, audio_url,
                   external_link, genre, release_date, is_published, created_at
            FROM {schema}.label_releases
            ORDER BY created_at DESC
        """)
        rows = cur.fetchall()
        releases = []
        for r in rows:
            releases.append({
                'id': r[0], 'title': r[1], 'artist_name': r[2], 'description': r[3],
                'cover_url': r[4], 'audio_url': r[5], 'external_link': r[6],
                'genre': r[7], 'release_date': str(r[8]) if r[8] else None,
                'is_published': r[9], 'created_at': str(r[10]),
            })
        cur.close(); conn.close()
        return ok({'releases': releases})

    # ─── АДМИН: добавить новинку ───────────────────────────────────────────
    if action == 'add-label-release' and method == 'POST':
        admin_id = get_admin(cur, token, schema)
        if not admin_id:
            cur.close(); conn.close()
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        title = str(body.get('title', '')).strip()
        artist_name = str(body.get('artist_name', '')).strip()
        description = str(body.get('description', '')).strip()
        external_link = str(body.get('external_link', '')).strip()
        genre = str(body.get('genre', '')).strip()
        release_date = body.get('release_date') or None
        is_published = body.get('is_published', True)

        if not title or not artist_name:
            cur.close(); conn.close()
            return err(400, 'Укажите название и артиста')

        s3 = get_s3()
        cover_url = None
        audio_url = None

        cover_data = body.get('cover_data', '')
        cover_name = str(body.get('cover_name', '')).strip()
        if cover_data:
            c_bytes = base64.b64decode(cover_data)
            c_ext = cover_name.rsplit('.', 1)[-1].lower() if '.' in cover_name else 'jpg'
            c_key = f'label-releases/covers/{uuid.uuid4()}.{c_ext}'
            img_types = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}
            s3.put_object(Bucket='files', Key=c_key, Body=c_bytes, ContentType=img_types.get(c_ext, 'image/jpeg'))
            cover_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{c_key}"

        audio_data = body.get('audio_data', '')
        audio_name = str(body.get('audio_name', '')).strip()
        if audio_data:
            a_bytes = base64.b64decode(audio_data)
            a_ext = audio_name.rsplit('.', 1)[-1].lower() if '.' in audio_name else 'mp3'
            a_key = f'label-releases/audio/{uuid.uuid4()}.{a_ext}'
            audio_types = {'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'flac': 'audio/flac'}
            s3.put_object(Bucket='files', Key=a_key, Body=a_bytes, ContentType=audio_types.get(a_ext, 'audio/mpeg'))
            audio_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{a_key}"

        cur.execute(f"""
            INSERT INTO {schema}.label_releases
                (title, artist_name, description, cover_url, audio_url, external_link, genre, release_date, is_published)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (title, artist_name, description or None, cover_url, audio_url,
              external_link or None, genre or None, release_date, is_published))
        row = cur.fetchone()
        conn.commit()
        cur.close(); conn.close()
        return ok({'release': {
            'id': row[0], 'title': title, 'artist_name': artist_name,
            'cover_url': cover_url, 'audio_url': audio_url, 'external_link': external_link,
            'is_published': is_published, 'created_at': str(row[1]),
        }})

    # ─── АДМИН: обновить новинку ───────────────────────────────────────────
    if action == 'update-label-release' and method == 'PUT':
        admin_id = get_admin(cur, token, schema)
        if not admin_id:
            cur.close(); conn.close()
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        rid = body.get('id')
        is_published = body.get('is_published')
        if rid is not None and is_published is not None:
            cur.execute(f"UPDATE {schema}.label_releases SET is_published = %s WHERE id = %s", (is_published, rid))
            conn.commit()
        cur.close(); conn.close()
        return ok({'ok': True})

    # ─── АДМИН: удалить новинку ────────────────────────────────────────────
    if action == 'del-label-release' and method == 'POST':
        admin_id = get_admin(cur, token, schema)
        if not admin_id:
            cur.close(); conn.close()
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        cur.execute(f"DELETE FROM {schema}.label_releases WHERE id = %s", (body.get('id'),))
        conn.commit()
        cur.close(); conn.close()
        return ok({'ok': True})

    # ─── ПУБЛИЧНЫЙ: список артистов лейбла ────────────────────────────────
    if action == 'list-artists' and method == 'GET':
        cur.execute(f"""
            SELECT id, name, url, photo_url, sort_order
            FROM {schema}.label_artists
            WHERE is_visible = TRUE
            ORDER BY sort_order ASC, id ASC
        """)
        rows = cur.fetchall()
        artists = [{'id': r[0], 'name': r[1], 'url': r[2], 'photo_url': r[3], 'sort_order': r[4]} for r in rows]
        cur.close(); conn.close()
        return ok({'artists': artists})

    # ─── АДМИН: все артисты (включая скрытых) ─────────────────────────────
    if action == 'admin-artists' and method == 'GET':
        admin_id = get_admin(cur, token, schema)
        if not admin_id:
            cur.close(); conn.close()
            return err(403, 'Доступ запрещён')
        cur.execute(f"""
            SELECT id, name, url, photo_url, sort_order, is_visible, created_at
            FROM {schema}.label_artists
            ORDER BY sort_order ASC, id ASC
        """)
        rows = cur.fetchall()
        artists = [{'id': r[0], 'name': r[1], 'url': r[2], 'photo_url': r[3], 'sort_order': r[4], 'is_visible': r[5], 'created_at': str(r[6])} for r in rows]
        cur.close(); conn.close()
        return ok({'artists': artists})

    # ─── АДМИН: добавить артиста ───────────────────────────────────────────
    if action == 'add-artist' and method == 'POST':
        admin_id = get_admin(cur, token, schema)
        if not admin_id:
            cur.close(); conn.close()
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        name = str(body.get('name', '')).strip()
        url = str(body.get('url', '')).strip()
        photo_url = str(body.get('photo_url', '')).strip() or None
        sort_order = int(body.get('sort_order', 0))
        file_data = body.get('file_data', '')
        file_name = str(body.get('file_name', 'photo.jpg')).strip()
        if not name:
            cur.close(); conn.close()
            return err(400, 'Укажите имя артиста')
        if file_data and not photo_url:
            s3 = get_s3()
            img_bytes = base64.b64decode(file_data)
            ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else 'jpg'
            img_key = f'artists/{uuid.uuid4()}.{ext}'
            img_types = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}
            s3.put_object(Bucket='files', Key=img_key, Body=img_bytes, ContentType=img_types.get(ext, 'image/jpeg'))
            photo_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{img_key}"
        cur.execute(f"""
            INSERT INTO {schema}.label_artists (name, url, photo_url, sort_order)
            VALUES (%s, %s, %s, %s) RETURNING id, created_at
        """, (name, url or None, photo_url, sort_order))
        row = cur.fetchone()
        conn.commit()
        cur.close(); conn.close()
        return ok({'artist': {'id': row[0], 'name': name, 'url': url, 'photo_url': photo_url, 'sort_order': sort_order, 'is_visible': True, 'created_at': str(row[1])}})

    # ─── АДМИН: обновить артиста ───────────────────────────────────────────
    if action == 'update-artist' and method == 'POST':
        admin_id = get_admin(cur, token, schema)
        if not admin_id:
            cur.close(); conn.close()
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        artist_id = body.get('id')
        if not artist_id:
            cur.close(); conn.close()
            return err(400, 'Укажите id')
        file_data = body.get('file_data', '')
        file_name = str(body.get('file_name', 'photo.jpg')).strip()
        photo_url = body.get('photo_url')
        if file_data:
            s3 = get_s3()
            img_bytes = base64.b64decode(file_data)
            ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else 'jpg'
            img_key = f'artists/{uuid.uuid4()}.{ext}'
            img_types = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}
            s3.put_object(Bucket='files', Key=img_key, Body=img_bytes, ContentType=img_types.get(ext, 'image/jpeg'))
            photo_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{img_key}"
        fields = {}
        if 'name' in body: fields['name'] = body['name']
        if 'url' in body: fields['url'] = body['url']
        if photo_url is not None: fields['photo_url'] = photo_url
        if 'sort_order' in body: fields['sort_order'] = int(body['sort_order'])
        if 'is_visible' in body: fields['is_visible'] = body['is_visible']
        if fields:
            set_sql = ', '.join(f"{k} = %s" for k in fields)
            cur.execute(f"UPDATE {schema}.label_artists SET {set_sql} WHERE id = %s", list(fields.values()) + [artist_id])
            conn.commit()
        cur.close(); conn.close()
        return ok({'ok': True})

    # ─── АДМИН: удалить артиста ───────────────────────────────────────────
    if action == 'del-artist' and method == 'POST':
        admin_id = get_admin(cur, token, schema)
        if not admin_id:
            cur.close(); conn.close()
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        cur.execute(f"DELETE FROM {schema}.label_artists WHERE id = %s", (body.get('id'),))
        conn.commit()
        cur.close(); conn.close()
        return ok({'ok': True})

    cur.close(); conn.close()
    return err(404, 'Действие не найдено')