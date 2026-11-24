import getpass
import secrets
from pathlib import Path
from werkzeug.security import generate_password_hash

root = Path(__file__).resolve().parent
env_path = root / ".env"
username = input("Choose admin username [ryan]: ").strip() or "ryan"
while True:
    password = getpass.getpass("Create a strong admin password (minimum 12 characters): ")
    if len(password) < 12:
        print("Use at least 12 characters.")
        continue
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Passwords do not match.")
        continue
    break

secret = secrets.token_urlsafe(48)
password_hash = generate_password_hash(password)
env_path.write_text(
    f"SECRET_KEY={secret}\n"
    f"ADMIN_USERNAME={username}\n"
    f"ADMIN_PASSWORD_HASH='{password_hash}'\n"
    "COOKIE_SECURE=0\n"
)
env_path.chmod(0o600)
print(f"\nAdmin account configured for username: {username}")
print("Credentials are stored as a password hash in the private .env file.")
print("Keep .env private. Do not upload it to GitHub.")
