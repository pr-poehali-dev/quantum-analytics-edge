"""
Новости лейбла: публичный список, добавление/редактирование/удаление из админки.
Роутинг через ?action=get-news|add-news|update-news|del-news
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
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def ok(data):
    return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False, default=str)}

def err(status, msg):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg}, ensure_ascii=False)}

def get_s3():
    return boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])

def get_admin(cur, token, schema):
    if not token:
        return None
    cur.execute(f"SELECT u.id FROM {schema}.sessions s JOIN {schema}.users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW() AND u.role = 'admin'", (token,))
    row = cur.fetchone()
    return row[0] if row else None

def handler(event: dict, context) -> dict:
    """Новости лейбла — публичное чтение и управление из админки."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', '')
    token = (event.get('headers') or {}).get('X-Auth-Token', '')
    schema = os.environ.get('MAIN_DB_SCHEMA', 't_p40522734_quantum_analytics_ed')

    conn = get_conn()
    cur = conn.cursor()

    # ─── Публичный список новостей ──────────────────────────────────────────
    if action == 'get-news' and method == 'GET':
        limit = int(qs.get('limit', 20))
        offset = int(qs.get('offset', 0))
        cur.execute(f"""
            SELECT id, title, body, image_url, published_at, created_at
            FROM {schema}.news
            WHERE is_visible = TRUE
            ORDER BY published_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        rows = cur.fetchall()
        cur.execute(f"SELECT COUNT(*) FROM {schema}.news WHERE is_visible = TRUE")
        total = cur.fetchone()[0]
        news = [{'id': r[0], 'title': r[1], 'body': r[2], 'image_url': r[3], 'published_at': str(r[4]), 'created_at': str(r[5])} for r in rows]
        cur.close(); conn.close()
        return ok({'news': news, 'total': total})

    # ─── Админ: все новости включая скрытые ────────────────────────────────
    if action == 'admin-news' and method == 'GET':
        admin_id = get_admin(cur, token, schema)
        if not admin_id:
            cur.close(); conn.close()
            return err(403, 'Доступ запрещён')
        cur.execute(f"""
            SELECT id, title, body, image_url, published_at, is_visible, created_at
            FROM {schema}.news
            ORDER BY published_at DESC
        """)
        rows = cur.fetchall()
        news = [{'id': r[0], 'title': r[1], 'body': r[2], 'image_url': r[3], 'published_at': str(r[4]), 'is_visible': r[5], 'created_at': str(r[6])} for r in rows]
        cur.close(); conn.close()
        return ok({'news': news})

    # ─── Админ: добавить новость ────────────────────────────────────────────
    if action == 'add-news' and method == 'POST':
        admin_id = get_admin(cur, token, schema)
        if not admin_id:
            cur.close(); conn.close()
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        title = str(body.get('title', '')).strip()
        text = str(body.get('body', '')).strip()
        file_data = body.get('file_data', '')
        file_name = str(body.get('file_name', 'image.jpg')).strip()
        published_at = body.get('published_at') or None

        if not title or not text:
            cur.close(); conn.close()
            return err(400, 'Укажите заголовок и текст')

        image_url = None
        if file_data:
            s3 = get_s3()
            img_bytes = base64.b64decode(file_data)
            ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else 'jpg'
            img_key = f'news/{uuid.uuid4()}.{ext}'
            img_types = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}
            s3.put_object(Bucket='files', Key=img_key, Body=img_bytes, ContentType=img_types.get(ext, 'image/jpeg'))
            image_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{img_key}"

        cur.execute(f"""
            INSERT INTO {schema}.news (title, body, image_url, published_at)
            VALUES (%s, %s, %s, COALESCE(%s::timestamp, NOW()))
            RETURNING id, published_at, created_at
        """, (title, text, image_url, published_at))
        row = cur.fetchone()
        conn.commit()
        cur.close(); conn.close()
        return ok({'news': {'id': row[0], 'title': title, 'body': text, 'image_url': image_url, 'published_at': str(row[1]), 'is_visible': True, 'created_at': str(row[2])}})

    # ─── Админ: обновить новость ────────────────────────────────────────────
    if action == 'update-news' and method == 'POST':
        admin_id = get_admin(cur, token, schema)
        if not admin_id:
            cur.close(); conn.close()
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        news_id = body.get('id')
        if not news_id:
            cur.close(); conn.close()
            return err(400, 'Укажите id')

        file_data = body.get('file_data', '')
        file_name = str(body.get('file_name', 'image.jpg')).strip()
        image_url = body.get('image_url')

        if file_data:
            s3 = get_s3()
            img_bytes = base64.b64decode(file_data)
            ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else 'jpg'
            img_key = f'news/{uuid.uuid4()}.{ext}'
            img_types = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}
            s3.put_object(Bucket='files', Key=img_key, Body=img_bytes, ContentType=img_types.get(ext, 'image/jpeg'))
            image_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{img_key}"

        fields = {}
        if 'title' in body: fields['title'] = body['title']
        if 'body' in body: fields['body'] = body['body']
        if image_url is not None: fields['image_url'] = image_url
        if 'is_visible' in body: fields['is_visible'] = body['is_visible']
        if 'published_at' in body and body['published_at']: fields['published_at'] = body['published_at']

        if fields:
            set_sql = ', '.join(f"{k} = %s" for k in fields)
            cur.execute(f"UPDATE {schema}.news SET {set_sql} WHERE id = %s", list(fields.values()) + [news_id])
            conn.commit()
        cur.close(); conn.close()
        return ok({'ok': True})

    # ─── Админ: удалить новость ─────────────────────────────────────────────
    if action == 'del-news' and method == 'POST':
        admin_id = get_admin(cur, token, schema)
        if not admin_id:
            cur.close(); conn.close()
            return err(403, 'Доступ запрещён')
        body = json.loads(event.get('body') or '{}')
        cur.execute(f"DELETE FROM {schema}.news WHERE id = %s", (body.get('id'),))
        conn.commit()
        cur.close(); conn.close()
        return ok({'ok': True})

    cur.close(); conn.close()
    return err(404, 'Неизвестный action')
