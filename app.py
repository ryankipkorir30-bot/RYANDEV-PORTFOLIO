import os
import re
import secrets
import sqlite3
import time
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, session, send_from_directory
from werkzeug.security import check_password_hash

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = Flask(__name__, static_folder=None)
app.secret_key = os.getenv("SECRET_KEY", "")
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.getenv("COOKIE_SECURE", "0") == "1",
    PERMANENT_SESSION_LIFETIME=60 * 60 * 8,
    MAX_CONTENT_LENGTH=20 * 1024,
)
DB_DIR = BASE_DIR / "instance"
DB_DIR.mkdir(exist_ok=True)
DB_PATH = DB_DIR / "messages.sqlite3"
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "ryan")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "")

# Lightweight per-process submission throttle. Use a shared rate limiter if deployed
# with multiple workers or on a public production host.
recent_submissions = {}
RATE_WINDOW_SECONDS = 60
RATE_LIMIT = 5


def db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db():
    with db() as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)


def csrf_ok():
    supplied = request.headers.get("X-CSRF-Token", "")
    expected = session.get("csrf_token", "")
    return bool(supplied and expected and secrets.compare_digest(supplied, expected))


def admin_required(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return jsonify(error="Authentication required."), 401
        return fn(*args, **kwargs)
    return wrapped


@app.after_request
def security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cache-Control"] = "no-store" if request.path.startswith("/api/admin") else "public, max-age=300"
    return response


@app.get("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/<path:filename>")
def public_files(filename):
    # Never expose environment files, the database, or hidden files.
    if any(part.startswith(".") for part in Path(filename).parts) or filename.startswith("instance/") or filename in {"app.py", "setup_admin.py"}:
        return "Not found", 404
    return send_from_directory(BASE_DIR, filename)


@app.get("/admin")
def admin_page():
    return send_from_directory(BASE_DIR, "admin.html")


@app.get("/api/csrf")
def csrf_token():
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
    return jsonify(csrf_token=token)


@app.post("/api/messages")
def create_message():
    if not csrf_ok():
        return jsonify(error="Please refresh the page and try again."), 400

    now = time.time()
    client_ip = request.remote_addr or "unknown"
    recent = [stamp for stamp in recent_submissions.get(client_ip, []) if now - stamp < RATE_WINDOW_SECONDS]
    if len(recent) >= RATE_LIMIT:
        return jsonify(error="Too many messages. Please wait a minute and try again."), 429

    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    phone = str(data.get("phone", "")).strip()
    subject = str(data.get("subject", "")).strip()
    message = str(data.get("message", "")).strip()

    if not all([name, email, phone, subject, message]):
        return jsonify(error="Please complete every field."), 400
    if len(name) > 80 or len(email) > 254 or len(phone) > 24 or len(subject) > 120 or len(message) > 5000:
        return jsonify(error="One or more fields are too long."), 400
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return jsonify(error="Enter a valid email address."), 400
    if not re.fullmatch(r"[+0-9() .-]{7,24}", phone):
        return jsonify(error="Enter a valid phone number, including country code."), 400

    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with db() as con:
        cur = con.execute(
            "INSERT INTO messages (name,email,phone,subject,message,created_at) VALUES (?,?,?,?,?,?)",
            (name, email, phone, subject, message, created_at),
        )
        message_id = cur.lastrowid

    recent.append(now)
    recent_submissions[client_ip] = recent
    return jsonify(ok=True, id=message_id), 201


@app.post("/api/admin/login")
def admin_login():
    if not csrf_ok():
        return jsonify(error="Session expired. Refresh and try again."), 400
    if not ADMIN_PASSWORD_HASH or not app.secret_key:
        return jsonify(error="Admin setup is incomplete. Run python3 setup_admin.py first."), 503

    data = request.get_json(silent=True) or {}
    username = str(data.get("username", ""))
    password = str(data.get("password", ""))
    if not secrets.compare_digest(username, ADMIN_USERNAME) or not check_password_hash(ADMIN_PASSWORD_HASH, password):
        return jsonify(error="Incorrect username or password."), 401

    session.clear()
    session["admin_logged_in"] = True
    session["csrf_token"] = secrets.token_urlsafe(32)
    session.permanent = True
    return jsonify(ok=True)


@app.post("/api/admin/logout")
@admin_required
def admin_logout():
    if not csrf_ok():
        return jsonify(error="Invalid session token."), 400
    session.clear()
    return jsonify(ok=True)


@app.get("/api/admin/messages")
@admin_required
def admin_messages():
    with db() as con:
        rows = con.execute(
            "SELECT id,name,email,phone,subject,message,is_read,created_at FROM messages ORDER BY id DESC LIMIT 300"
        ).fetchall()
        total = con.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
        unread = con.execute("SELECT COUNT(*) FROM messages WHERE is_read=0").fetchone()[0]
    return jsonify(
        messages=[dict(row) for row in rows],
        stats={"total": total, "unread": unread, "read": total - unread},
    )


@app.patch("/api/admin/messages/<int:message_id>/read")
@admin_required
def mark_read(message_id):
    if not csrf_ok():
        return jsonify(error="Invalid session token."), 400
    with db() as con:
        cur = con.execute("UPDATE messages SET is_read=1 WHERE id=?", (message_id,))
    if cur.rowcount == 0:
        return jsonify(error="Message not found."), 404
    return jsonify(ok=True)


@app.delete("/api/admin/messages/<int:message_id>")
@admin_required
def delete_message(message_id):
    if not csrf_ok():
        return jsonify(error="Invalid session token."), 400
    with db() as con:
        cur = con.execute("DELETE FROM messages WHERE id=?", (message_id,))
    if cur.rowcount == 0:
        return jsonify(error="Message not found."), 404
    return jsonify(ok=True)


init_db()

if __name__ == "__main__":
    if not app.secret_key:
        raise SystemExit("Missing SECRET_KEY. Run: python3 setup_admin.py")
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=False)
