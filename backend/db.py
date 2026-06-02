import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "quilombo.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

SCHEMA = """
CREATE TABLE IF NOT EXISTS communities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela desnormalizada para listagem pública (sem community_id por design).
-- Leitura cross-tenant segura. Escrita só via community_profiles (que tem community_id).
CREATE TABLE IF NOT EXISTS community_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    community_slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    image_url TEXT,
    short_description TEXT
);

-- Dados editáveis do card, scoped por community_id.
-- Toda escrita/deleção passa por aqui; após salvar, sincroniza community_cards.
CREATE TABLE IF NOT EXISTS community_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    community_id INTEGER NOT NULL UNIQUE REFERENCES communities(id),
    image_url TEXT,
    short_description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    community_id INTEGER NOT NULL REFERENCES communities(id),
    email TEXT NOT NULL,
    UNIQUE(community_id, email)
);

CREATE TABLE IF NOT EXISTS institutional_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    community_id INTEGER NOT NULL UNIQUE REFERENCES communities(id),
    style TEXT DEFAULT 'classic',
    palette TEXT DEFAULT 'verde'
);

CREATE TABLE IF NOT EXISTS page_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    community_id INTEGER NOT NULL REFERENCES communities(id),
    section_type TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    content TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS storage_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    community_id INTEGER NOT NULL REFERENCES communities(id),
    filename TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    alt_text TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

STORAGE_LIMIT_BYTES = 50 * 1024 * 1024  # 50 MB por comunidade
SECTIONS_LIMIT = 20                      # máximo de seções por comunidade
UPLOAD_MAX_BYTES = 5 * 1024 * 1024       # 5 MB antes do processamento
IMAGE_MAX_DIM = 1920                     # px no lado maior após resize

def _migrate(conn):
    """Migrações incrementais para bancos já existentes."""
    cols = {row[1] for row in conn.execute("PRAGMA table_info(storage_usage)").fetchall()}
    if "alt_text" not in cols:
        conn.execute("ALTER TABLE storage_usage ADD COLUMN alt_text TEXT NOT NULL DEFAULT ''")

def init_db():
    with get_db() as conn:
        conn.executescript(SCHEMA)
        _migrate(conn)
