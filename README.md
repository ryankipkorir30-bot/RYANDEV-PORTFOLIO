# RyanDev Portfolio + Private Message Center

The original responsive black-and-gold RyanDev portfolio is preserved and now includes a private contact-message system.

## Added features

- Contact form sends submissions to a Flask backend.
- SQLite stores visitor name, email, WhatsApp phone, subject, message and timestamp.
- Private admin login at `/admin`.
- Passwords are stored as Werkzeug password hashes in the local `.env` file.
- Admin inbox shows total, unread and read counts.
- Select a message to read it, mark it as read, compose a WhatsApp response, email the visitor, or delete the message.
- CSRF tokens protect message submission and authenticated state-changing admin requests.
- Basic per-IP submission throttling and input validation.
- `.env` and SQLite database files are excluded from Git.

## Run on Kali Linux

From this project folder:

```bash
sudo apt update
sudo apt install -y python3-venv

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create your private admin username/password and local secret key.
python3 setup_admin.py

# Start the website and API.
python3 app.py
```

Open:
- Portfolio: http://127.0.0.1:5000/
- Private inbox: http://127.0.0.1:5000/admin

The database is created automatically at `instance/messages.sqlite3`.

## Important security notes

- Choose a unique password of at least 12 characters.
- Keep `.env` and `instance/messages.sqlite3` private. Never commit or upload them.
- Back up `instance/messages.sqlite3` securely.
- This starter uses an in-memory rate limiter suitable for local testing/single-process use. For public production deployment, add a shared rate limiter, HTTPS, platform secrets, regular backups, and an appropriate persistent disk for SQLite (or a managed database).
- Set `COOKIE_SECURE=1` when the site is served over HTTPS.
- Do not expose the local Flask development server directly to the public internet. Use a production WSGI server such as Gunicorn behind an HTTPS reverse proxy or a trusted Python hosting provider.
- WhatsApp links open a prefilled message for the administrator to review and send. This does not send WhatsApp messages automatically.

## Hosting

GitHub Pages can host only the static portfolio files; it cannot run this Flask backend or store submissions in SQLite. To receive messages from the live website, deploy the Flask application to a Python-capable host with persistent storage and configure the public frontend/API to use that hosted backend. Keep the database and `.env` on the backend host only.

## Original portfolio

The existing gallery, portrait images, project detail pages, responsive layout, and contact/social links remain part of this project.
