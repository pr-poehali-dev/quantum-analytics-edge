"""
Публичный API смарт-линков релизов. Без авторизации.
"""
import json
import os
import psycopg2


CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def ok(data):
    return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def err(status, msg):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    """Публичный API смарт-линков: получить данные по slug."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    schema = os.environ.get('MAIN_DB_SCHEMA') or 't_p40522734_quantum_analytics_ed'

    if method == 'GET':
        slug = params.get('slug', '').strip().lower()
        if not slug:
            return err(400, 'Укажите slug')

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, release_id, slug, title, artist_name, cover_url, description, links, active FROM {schema}.smart_links WHERE slug = %s",
            (slug,)
        )
        row = cur.fetchone()
        if not row:
            return err(404, 'Смарт-линк не найден')
        if not row[8]:
            return err(404, 'Смарт-линк недоступен')

        return ok({
            'id': row[0],
            'release_id': row[1],
            'slug': row[2],
            'title': row[3],
            'artist_name': row[4],
            'cover_url': row[5],
            'description': row[6],
            'links': row[7] if row[7] else [],
        })

    return err(404, 'Not found')
