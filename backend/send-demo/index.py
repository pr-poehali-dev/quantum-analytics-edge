import json
import os
import requests

TELEGRAM_CHAT_ID = "6162140923"


def handler(event: dict, context) -> dict:
    """Отправка демо-материала артиста в Telegram-бот Калашников Саунд"""

    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400",
            },
            "body": "",
        }

    body = json.loads(event.get("body") or "{}")
    name = body.get("name", "").strip()
    contact = body.get("contact", "").strip()
    genre = body.get("genre", "").strip()
    link = body.get("link", "").strip()
    about = body.get("about", "").strip()

    if not name or not contact or not link:
        return {
            "statusCode": 400,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": "Заполните обязательные поля: имя, контакт, ссылка"}),
        }

    token = os.environ["TELEGRAM_BOT_TOKEN"]

    message = (
        f"🎵 *Новое демо для Калашников Саунд*\n\n"
        f"*Артист:* {name}\n"
        f"*Контакт:* {contact}\n"
        f"*Жанр:* {genre or 'не указан'}\n"
        f"*Ссылка на материал:* {link}\n"
        f"*О себе:* {about or 'не указано'}"
    )

    resp = requests.post(
        f"https://api.telegram.org/bot{token}/sendMessage",
        json={
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "Markdown",
        },
        timeout=10,
    )

    if not resp.ok:
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": "Ошибка отправки в Telegram"}),
        }

    return {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*"},
        "body": json.dumps({"success": True}),
    }