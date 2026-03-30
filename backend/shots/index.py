"""
Видеошоты: загрузка, лента, лайки, комментарии, удаление, статистика.
Роутинг через ?action=
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

def get_user(cur, token, schema):
    if not token:
        return None
    cur.execute(f"SELECT u.id, u.role, u.artist_name FROM {schema}.sessions s JOIN {schema}.users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW()", (token,))
    return cur.fetchone()

def get_s3():
    return boto3.client('s3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )

def handler(event: dict, context) -> dict:
    """Видеошоты. Загрузка, лента, лайки, комментарии."""
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

    # ─── Лента видео (публично, но лайки зависят от авторизации) ───────────
    if action == 'feed' and method == 'GET':
        limit = min(int(qs.get('limit', '20')), 50)
        offset = int(qs.get('offset', '0'))
        user_id_filter = qs.get('user_id')

        u = get_user(cur, token, schema)
        viewer_id = u[0] if u else None

        where = f"WHERE s.status = 'active'"
        params = []
        if user_id_filter:
            where += " AND s.user_id = %s"
            params.append(int(user_id_filter))

        cur.execute(f"""
            SELECT s.id, s.user_id, u.artist_name, s.title, s.description,
                   s.video_url, s.thumbnail_url, s.duration, s.views,
                   s.created_at,
                   (SELECT COUNT(*) FROM {schema}.shot_likes l WHERE l.shot_id = s.id) AS likes_count,
                   (SELECT COUNT(*) FROM {schema}.shot_comments c WHERE c.shot_id = s.id) AS comments_count
            FROM {schema}.shots s
            JOIN {schema}.users u ON u.id = s.user_id
            {where}
            ORDER BY s.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        rows = cur.fetchall()

        liked_ids = set()
        if viewer_id and rows:
            shot_ids = [r[0] for r in rows]
            placeholders = ','.join(['%s'] * len(shot_ids))
            cur.execute(f"SELECT shot_id FROM {schema}.shot_likes WHERE user_id = %s AND shot_id IN ({placeholders})", [viewer_id] + shot_ids)
            liked_ids = {r[0] for r in cur.fetchall()}

        shots = []
        for r in rows:
            shots.append({
                'id': r[0], 'user_id': r[1], 'artist_name': r[2],
                'title': r[3], 'description': r[4],
                'video_url': r[5], 'thumbnail_url': r[6],
                'duration': r[7], 'views': r[8],
                'created_at': str(r[9]),
                'likes_count': r[10], 'comments_count': r[11],
                'liked': r[0] in liked_ids,
                'is_owner': viewer_id == r[1],
            })
        cur.close(); conn.close()
        return ok({'shots': shots})

    # ─── Загрузить видео ────────────────────────────────────────────────────
    if action == 'upload' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u:
            cur.close(); conn.close()
            return err(401, 'Требуется авторизация')

        body = json.loads(event.get('body') or '{}')
        title = str(body.get('title', '')).strip()
        description = str(body.get('description', '')).strip()
        video_data = body.get('video_data', '')
        video_name = str(body.get('video_name', 'video.mp4'))
        thumb_data = body.get('thumb_data', '')
        thumb_name = str(body.get('thumb_name', 'thumb.jpg'))

        if not title or not video_data:
            cur.close(); conn.close()
            return err(400, 'Укажите название и видеофайл')

        s3 = get_s3()

        video_bytes = base64.b64decode(video_data)
        ext = video_name.rsplit('.', 1)[-1].lower() if '.' in video_name else 'mp4'
        video_key = f'shots/{uuid.uuid4()}.{ext}'
        video_types = {'mp4': 'video/mp4', 'mov': 'video/quicktime', 'webm': 'video/webm', 'avi': 'video/x-msvideo'}
        s3.put_object(Bucket='files', Key=video_key, Body=video_bytes, ContentType=video_types.get(ext, 'video/mp4'))
        video_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{video_key}"

        thumbnail_url = None
        if thumb_data:
            t_bytes = base64.b64decode(thumb_data)
            t_ext = thumb_name.rsplit('.', 1)[-1].lower() if '.' in thumb_name else 'jpg'
            t_key = f'shots/thumbs/{uuid.uuid4()}.{t_ext}'
            img_types = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}
            s3.put_object(Bucket='files', Key=t_key, Body=t_bytes, ContentType=img_types.get(t_ext, 'image/jpeg'))
            thumbnail_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{t_key}"

        cur.execute(f"""
            INSERT INTO {schema}.shots (user_id, title, description, video_url, thumbnail_url)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (u[0], title, description or None, video_url, thumbnail_url))
        row = cur.fetchone()
        conn.commit()
        cur.close(); conn.close()
        return ok({'shot': {
            'id': row[0], 'title': title, 'video_url': video_url,
            'thumbnail_url': thumbnail_url, 'artist_name': u[2],
            'created_at': str(row[1]), 'likes_count': 0, 'comments_count': 0,
            'views': 0, 'liked': False, 'is_owner': True,
        }})

    # ─── Лайк / дизлайк ────────────────────────────────────────────────────
    if action == 'like' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u:
            cur.close(); conn.close()
            return err(401, 'Требуется авторизация')
        body = json.loads(event.get('body') or '{}')
        shot_id = body.get('shot_id')
        if not shot_id:
            cur.close(); conn.close()
            return err(400, 'Укажите shot_id')

        cur.execute(f"SELECT id FROM {schema}.shot_likes WHERE shot_id = %s AND user_id = %s", (shot_id, u[0]))
        existing = cur.fetchone()
        if existing:
            cur.execute(f"DELETE FROM {schema}.shot_likes WHERE shot_id = %s AND user_id = %s", (shot_id, u[0]))
            liked = False
        else:
            cur.execute(f"INSERT INTO {schema}.shot_likes (shot_id, user_id) VALUES (%s, %s)", (shot_id, u[0]))
            liked = True
        conn.commit()

        cur.execute(f"SELECT COUNT(*) FROM {schema}.shot_likes WHERE shot_id = %s", (shot_id,))
        count = cur.fetchone()[0]
        cur.close(); conn.close()
        return ok({'liked': liked, 'likes_count': count})

    # ─── Комментарии: получить ──────────────────────────────────────────────
    if action == 'comments' and method == 'GET':
        shot_id = qs.get('shot_id')
        if not shot_id:
            cur.close(); conn.close()
            return err(400, 'Укажите shot_id')
        cur.execute(f"""
            SELECT c.id, c.user_id, u.artist_name, c.text, c.created_at
            FROM {schema}.shot_comments c
            JOIN {schema}.users u ON u.id = c.user_id
            WHERE c.shot_id = %s
            ORDER BY c.created_at ASC
        """, (shot_id,))
        comments = [{'id': r[0], 'user_id': r[1], 'artist_name': r[2], 'text': r[3], 'created_at': str(r[4])} for r in cur.fetchall()]
        cur.close(); conn.close()
        return ok({'comments': comments})

    # ─── Комментарии: добавить ──────────────────────────────────────────────
    if action == 'comment' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u:
            cur.close(); conn.close()
            return err(401, 'Требуется авторизация')
        body = json.loads(event.get('body') or '{}')
        shot_id = body.get('shot_id')
        text = str(body.get('text', '')).strip()
        if not shot_id or not text:
            cur.close(); conn.close()
            return err(400, 'Укажите shot_id и text')
        cur.execute(f"""
            INSERT INTO {schema}.shot_comments (shot_id, user_id, text)
            VALUES (%s, %s, %s) RETURNING id, created_at
        """, (shot_id, u[0], text[:500]))
        row = cur.fetchone()
        conn.commit()
        cur.close(); conn.close()
        return ok({'comment': {'id': row[0], 'user_id': u[0], 'artist_name': u[2], 'text': text, 'created_at': str(row[1])}})

    # ─── Удалить видео (владелец или admin) ────────────────────────────────
    if action == 'delete' and method == 'POST':
        u = get_user(cur, token, schema)
        if not u:
            cur.close(); conn.close()
            return err(401, 'Требуется авторизация')
        body = json.loads(event.get('body') or '{}')
        shot_id = body.get('shot_id')
        cur.execute(f"SELECT user_id FROM {schema}.shots WHERE id = %s", (shot_id,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return err(404, 'Видео не найдено')
        if row[0] != u[0] and u[1] != 'admin':
            cur.close(); conn.close()
            return err(403, 'Нет доступа')
        cur.execute(f"UPDATE {schema}.shots SET status = 'deleted' WHERE id = %s", (shot_id,))
        conn.commit()
        cur.close(); conn.close()
        return ok({'ok': True})

    # ─── Увеличить счётчик просмотров ───────────────────────────────────────
    if action == 'view' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        shot_id = body.get('shot_id')
        if shot_id:
            cur.execute(f"UPDATE {schema}.shots SET views = views + 1 WHERE id = %s", (shot_id,))
            conn.commit()
        cur.close(); conn.close()
        return ok({'ok': True})

    # ─── Статистика для кабинета ────────────────────────────────────────────
    if action == 'my-stats' and method == 'GET':
        u = get_user(cur, token, schema)
        if not u:
            cur.close(); conn.close()
            return err(401, 'Требуется авторизация')
        cur.execute(f"""
            SELECT s.id, s.title, s.video_url, s.thumbnail_url, s.views, s.created_at,
                   (SELECT COUNT(*) FROM {schema}.shot_likes l WHERE l.shot_id = s.id) AS likes,
                   (SELECT COUNT(*) FROM {schema}.shot_comments c WHERE c.shot_id = s.id) AS comments
            FROM {schema}.shots s
            WHERE s.user_id = %s AND s.status = 'active'
            ORDER BY s.created_at DESC
        """, (u[0],))
        shots = []
        total_views = 0
        total_likes = 0
        for r in cur.fetchall():
            shots.append({'id': r[0], 'title': r[1], 'video_url': r[2], 'thumbnail_url': r[3],
                          'views': r[4], 'created_at': str(r[5]), 'likes': r[6], 'comments': r[7]})
            total_views += r[4] or 0
            total_likes += r[6] or 0
        cur.close(); conn.close()
        return ok({'shots': shots, 'total_views': total_views, 'total_likes': total_likes})

    cur.close(); conn.close()
    return err(404, 'Неизвестное действие')
