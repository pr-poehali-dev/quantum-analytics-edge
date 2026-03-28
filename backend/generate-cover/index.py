"""
Генерация обложки для трека через Together AI (FLUX). v2
Принимает название трека и описание стиля, возвращает URL загруженного изображения.
"""
import json
import os
import uuid
import base64
import boto3
import psycopg2
import requests

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def ok(data):
    return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False)}

def err(status, msg):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg}, ensure_ascii=False)}

def get_user(cur, token, schema):
    cur.execute(f"SELECT u.id, u.role FROM {schema}.sessions s JOIN {schema}.users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW()", (token,))
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    """Генерация обложки трека через FLUX AI. POST: title, style, artist_name."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return err(405, 'Метод не поддерживается')

    token = (event.get('headers') or {}).get('X-Session-Token', '')
    schema = os.environ.get('MAIN_DB_SCHEMA') or 't_p40522734_quantum_analytics_ed'

    conn = get_conn()
    cur = conn.cursor()
    user = get_user(cur, token, schema)
    cur.close()
    conn.close()

    if not user:
        return err(401, 'Не авторизован')

    body = json.loads(event.get('body') or '{}')
    title = str(body.get('title', '')).strip()
    style = str(body.get('style', '')).strip()
    artist_name = str(body.get('artist_name', '')).strip()

    if not title:
        return err(400, 'Укажите название трека')

    style_hint = f", {style}" if style else ""
    artist_hint = f" by {artist_name}" if artist_name else ""
    prompt = (
        f"Music album cover art for a track titled '{title}'{artist_hint}{style_hint}. "
        "High quality, visually striking, professional music cover design, "
        "square format, cinematic lighting, 4K, ultra detailed."
    )

    together_key = os.environ.get('TOGETHER_API_KEY', '')
    if not together_key:
        return err(500, 'API ключ генерации не настроен')

    resp = requests.post(
        'https://api.together.xyz/v1/images/generations',
        headers={
            'Authorization': f'Bearer {together_key}',
            'Content-Type': 'application/json',
        },
        json={
            'model': 'black-forest-labs/FLUX.1-schnell-Free',
            'prompt': prompt,
            'width': 1024,
            'height': 1024,
            'steps': 4,
            'n': 1,
            'response_format': 'b64_json',
        },
        timeout=60,
    )

    if not resp.ok:
        return err(502, f'Ошибка генерации: {resp.text[:200]}')

    data = resp.json()
    b64 = data['data'][0]['b64_json']
    img_bytes = base64.b64decode(b64)

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    key = f'covers/ai/{uuid.uuid4()}.jpg'
    s3.put_object(Bucket='files', Key=key, Body=img_bytes, ContentType='image/jpeg')
    image_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

    return ok({'url': image_url})