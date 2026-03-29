"""
Генерация музыки через Suno AI API.
action=generate — создать песню по описанию/тексту
action=status   — проверить статус генерации по task_id
"""
import json
import os
import urllib.request
import urllib.parse
import urllib.error
import sqlite3

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

SUNO_BASE = 'https://apibox.erweima.ai/api/v1'


def ok(data):
    return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False)}


def err(status, msg):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg}, ensure_ascii=False)}


def suno_request(method: str, path: str, payload: dict = None, params: dict = None):
    key = os.environ.get('SUNO_API_KEY', '')
    url = SUNO_BASE + path
    if params:
        url += '?' + urllib.parse.urlencode(params)
    headers = {
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
    }
    data = json.dumps(payload).encode() if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, {'error': e.read().decode()[:300]}


def verify_token(token: str) -> bool:
    schema = os.environ.get('MAIN_DB_SCHEMA', '')
    db_url = os.environ.get('DATABASE_URL', '')
    if not db_url or not token:
        return False
    try:
        import psycopg2
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute(
            f"SELECT u.id FROM {schema}.sessions s JOIN {schema}.users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW()",
            (token,)
        )
        result = cur.fetchone()
        cur.close()
        conn.close()
        return bool(result)
    except Exception:
        return True


def handler(event: dict, context) -> dict:
    """Генерация музыки через Suno AI. action=generate|status."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return err(405, 'Метод не поддерживается')

    token = (event.get('headers') or {}).get('X-Session-Token', '')
    if not token:
        return err(401, 'Не авторизован')

    suno_key = os.environ.get('SUNO_API_KEY', '')
    if not suno_key:
        return err(500, 'SUNO_API_KEY не настроен')

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', 'generate')

    if action == 'status':
        task_id = body.get('task_id', '')
        if not task_id:
            return err(400, 'Укажите task_id')
        status_code, data = suno_request('GET', '/generate/record-info', params={'taskId': task_id})
        if status_code != 200:
            return err(502, f'Ошибка Suno API: {data}')
        return ok(data)

    prompt = body.get('prompt', '').strip()
    title = body.get('title', '').strip()
    style = body.get('style', '').strip()
    lyrics = body.get('lyrics', '').strip()
    instrumental = bool(body.get('instrumental', False))

    if not prompt and not lyrics:
        return err(400, 'Укажите описание или текст песни')

    payload = {
        'prompt': lyrics if lyrics else prompt,
        'style': style,
        'title': title or 'Generated Track',
        'customMode': bool(lyrics),
        'instrumental': instrumental,
        'callBackUrl': '',
    }

    status_code, data = suno_request('POST', '/generate', payload=payload)
    if status_code != 200:
        return err(502, f'Ошибка Suno API: {data}')
    return ok(data)