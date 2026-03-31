"""
AI-ассистент для чата поддержки артистов на базе Cerebras.
Отвечает на вопросы по теме лейбла, дистрибьюции и релизов.
Если не может помочь — предлагает передать вопрос живому менеджеру.
"""
import json
import os
import urllib.request

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

SYSTEM_PROMPT = """Ты — AI-ассистент музыкального лейбла "Калашников Саунд".
Ты помогаешь артистам с вопросами о:
- Загрузке и публикации релизов (EP, альбомов, синглов)
- Дистрибьюции музыки на платформы (Spotify, Apple Music, ВКонтакте, YouTube Music, TikTok, Deezer и др.)
- Роялти и выплатах
- Статусах релизов (на проверке, опубликован, отклонён)
- Требованиях к аудиофайлам (WAV/MP3, 44.1kHz, 16/24bit)
- Требованиях к обложкам (3000x3000px, JPG/PNG, без текста нарушающего авторские права)
- Сроках публикации (обычно 2-7 рабочих дней)
- Работе с кабинетом артиста

Отвечай коротко, дружелюбно и по-русски.
Если вопрос не связан с лейблом или музыкой — вежливо скажи что специализируешься только на музыкальных вопросах.
Если не знаешь точного ответа или вопрос требует ручного решения — скажи об этом и предложи передать вопрос менеджеру лейбла.
Максимум 3-4 предложения в ответе."""


def call_cerebras(messages: list) -> str:
    api_key = os.environ.get('CEREBRAS_API_KEY', '')
    payload = json.dumps({
        "model": "llama-3.3-70b",
        "messages": messages,
        "max_tokens": 300,
        "temperature": 0.7,
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://api.cerebras.ai/v1/chat/completions',
        data=payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    return data['choices'][0]['message']['content'].strip()


def handler(event: dict, context) -> dict:
    """AI-ассистент поддержки: отвечает на вопросы артистов о лейбле и дистрибьюции."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    user_message = (body.get('message') or '').strip()
    history = body.get('history') or []

    if not user_message:
        return {
            'statusCode': 400,
            'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Сообщение не может быть пустым'}, ensure_ascii=False)
        }

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history[-6:]:
        if h.get('role') in ('user', 'assistant') and h.get('content'):
            messages.append({"role": h['role'], "content": h['content']})
    messages.append({"role": "user", "content": user_message})

    reply = call_cerebras(messages)

    needs_human = any(kw in reply.lower() for kw in [
        'менеджер', 'передать', 'не знаю', 'уточнить', 'свяжется', 'обратитесь'
    ])

    return {
        'statusCode': 200,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps({'reply': reply, 'needs_human': needs_human}, ensure_ascii=False)
    }
