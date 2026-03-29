"""
Управление треками артиста: загрузка, список, удаление. v2
"""
import json
import os
import base64
import psycopg2
import boto3
from datetime import datetime

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
    schema = os.environ.get('MAIN_DB_SCHEMA') or 't_p40522734_quantum_analytics_ed'

    conn = get_conn()
    cur = conn.cursor()

    user = get_user(cur, token, schema)
    if not user:
        return json_response(401, {'error': 'Не авторизован'})

    user_id, role = user

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    # Загрузка обложки релиза (multipart или base64)
    if method == 'POST' and action == 'upload-cover':
        import re
        body_raw = event.get('body') or ''
        is_base64 = event.get('isBase64Encoded', False)

        # Попытка получить файл из multipart/form-data
        content_type = (event.get('headers') or {}).get('content-type', '') or (event.get('headers') or {}).get('Content-Type', '')
        img_bytes = None

        if 'multipart/form-data' in content_type and 'boundary=' in content_type:
            boundary = content_type.split('boundary=')[-1].strip()
            if is_base64:
                raw_bytes = base64.b64decode(body_raw)
            else:
                raw_bytes = body_raw.encode('latin-1') if isinstance(body_raw, str) else body_raw
            # Найти содержимое файла после двойного CRLF
            sep = ('--' + boundary).encode()
            parts = raw_bytes.split(sep)
            for part in parts:
                if b'filename=' in part:
                    header_end = part.find(b'\r\n\r\n')
                    if header_end != -1:
                        img_bytes = part[header_end + 4:].rstrip(b'\r\n--')
                        break
        else:
            # Попытка получить из JSON body
            try:
                jbody = json.loads(body_raw)
                fd = jbody.get('file_data', '')
                if fd:
                    img_bytes = base64.b64decode(fd)
            except Exception:
                pass

        if not img_bytes:
            return json_response(400, {'error': 'Файл обложки не найден в запросе'})

        s3 = boto3.client('s3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
        )
        key = f'covers/{user_id}/{datetime.now().timestamp()}.jpg'
        s3.put_object(Bucket='files', Key=key, Body=img_bytes, ContentType='image/jpeg')
        cover_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        return json_response(200, {'cover_url': cover_url})

    # Загрузка трека
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        title = body.get('title', '').strip()
        file_data = body.get('file_data', '')
        file_name = body.get('file_name', '')

        if not title or not file_data or not file_name:
            return json_response(400, {'error': 'Укажите название и файл'})

        file_bytes = base64.b64decode(file_data)
        s3 = boto3.client('s3',
            endpoint_url='https://bucket.poehali.dev',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
        )
        key = f'tracks/{user_id}/{datetime.now().timestamp()}_{file_name}'
        s3.put_object(Bucket='files', Key=key, Body=file_bytes, ContentType='audio/mpeg')
        file_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

        cur.execute(f'INSERT INTO {schema}.tracks (user_id, title, file_url, file_name) VALUES (%s, %s, %s, %s) RETURNING id, created_at', (user_id, title, file_url, file_name))
        row = cur.fetchone()
        conn.commit()

        return json_response(200, {'track': {'id': row[0], 'title': title, 'file_url': file_url, 'file_name': file_name, 'status': 'uploaded', 'created_at': str(row[1])}})

    # Список треков
    if method == 'GET':
        target_user_id = user_id
        params = event.get('queryStringParameters') or {}
        if role == 'admin' and params.get('user_id'):
            target_user_id = int(params['user_id'])

        cur.execute(f'SELECT id, title, file_url, file_name, status, notes, created_at FROM {schema}.tracks WHERE user_id = %s ORDER BY created_at DESC', (target_user_id,))
        rows = cur.fetchall()
        tracks = [{'id': r[0], 'title': r[1], 'file_url': r[2], 'file_name': r[3], 'status': r[4], 'notes': r[5], 'created_at': str(r[6])} for r in rows]
        return json_response(200, {'tracks': tracks})

    return json_response(404, {'error': 'Not found'})