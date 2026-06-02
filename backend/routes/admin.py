import io
import json
import os
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Form, HTTPException, Header, UploadFile, File, Depends
from PIL import Image
from pydantic import BaseModel

from db import (
    get_db,
    STORAGE_LIMIT_BYTES,
    SECTIONS_LIMIT,
    UPLOAD_MAX_BYTES,
    IMAGE_MAX_DIM,
)
from routes.auth import get_current_admin
from tenancy import require_tenant

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

router = APIRouter(prefix="/api/admin", tags=["admin"])

VALID_SECTION_TYPES = {
    "hero", "description_short", "description_long",
    "carousel", "events", "timeline", "location",
}

# Deve estar em sincronia com frontend/src/config/pageStyles.js
STYLES = {
    "uniao":  {"label": "União & Comunidade", "palettes": ["verde", "terracota", "ocre", "indigo"]},
    "raizes": {"label": "Raízes",             "palettes": ["verde", "terracota", "ocre", "indigo"]},
}


# ── helpers ───────────────────────────────────────────────────────────────────

def _require_session(slug: str, authorization: Optional[str]) -> dict:
    return get_current_admin(slug, authorization)


def _get_community_id(conn, slug: str) -> int:
    row = conn.execute("SELECT id FROM communities WHERE slug = ?", (slug,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Comunidade não encontrada")
    return row["id"]


def _is_image_in_use(conn, community_id: int, filename: str) -> bool:
    url = f"/uploads/{filename}"

    # verifica seções (JSON)
    sections = conn.execute(
        "SELECT content FROM page_sections WHERE community_id = ?", (community_id,)
    ).fetchall()
    for s in sections:
        if url in s["content"]:
            return True

    # verifica perfil do tenant
    profile = conn.execute(
        "SELECT image_url FROM community_profiles WHERE community_id = ?", (community_id,)
    ).fetchone()
    if profile and profile["image_url"] == url:
        return True

    # verifica card da listagem (tabela sem tenant, acessada via slug)
    slug_row = conn.execute(
        "SELECT slug FROM communities WHERE id = ?", (community_id,)
    ).fetchone()
    card = conn.execute(
        "SELECT image_url FROM community_cards WHERE community_slug = ?", (slug_row["slug"],)
    ).fetchone()
    if card and card["image_url"] == url:
        return True

    return False


def _process_image(raw: bytes) -> bytes:
    """Converte para WebP, redimensiona se necessário, qualidade 82."""
    img = Image.open(io.BytesIO(raw))

    # normaliza para RGB (lida com PNG RGBA, paletas, etc.)
    if img.mode == "P":
        img = img.convert("RGBA")
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # redimensiona mantendo aspect ratio se ultrapassar IMAGE_MAX_DIM
    w, h = img.size
    if w > IMAGE_MAX_DIM or h > IMAGE_MAX_DIM:
        ratio = min(IMAGE_MAX_DIM / w, IMAGE_MAX_DIM / h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    out = io.BytesIO()
    img.save(out, format="WEBP", quality=82, method=4)
    return out.getvalue()


# ── card (aba 1) ──────────────────────────────────────────────────────────────

@router.get("/card")
def get_card(slug: str = Depends(require_tenant), authorization: Optional[str] = Header(None)):
    _require_session(slug, authorization)
    with get_db() as conn:
        cid = _get_community_id(conn, slug)
        profile = conn.execute(
            "SELECT image_url, short_description FROM community_profiles WHERE community_id = ?",
            (cid,),
        ).fetchone()
        community = conn.execute(
            "SELECT name, location FROM communities WHERE id = ?", (cid,)
        ).fetchone()
    return {
        "name": community["name"],
        "location": community["location"],
        "image_url": profile["image_url"] if profile else None,
        "short_description": profile["short_description"] if profile else None,
    }


class CardUpdate(BaseModel):
    image_url: Optional[str] = None
    short_description: Optional[str] = None


@router.put("/card")
def update_card(body: CardUpdate, slug: str = Depends(require_tenant), authorization: Optional[str] = Header(None)):
    _require_session(slug, authorization)
    with get_db() as conn:
        cid = _get_community_id(conn, slug)
        conn.execute(
            """UPDATE community_profiles
               SET image_url = ?, short_description = ?, updated_at = CURRENT_TIMESTAMP
               WHERE community_id = ?""",
            (body.image_url, body.short_description, cid),
        )
        conn.execute(
            "UPDATE community_cards SET image_url = ?, short_description = ? WHERE community_slug = ?",
            (body.image_url, body.short_description, slug),
        )
    return {"ok": True}


# ── página institucional — estilo ─────────────────────────────────────────────

@router.get("/styles")
def get_styles(slug: str = Depends(require_tenant), authorization: Optional[str] = Header(None)):
    _require_session(slug, authorization)
    return STYLES


@router.get("/page")
def get_page_config(slug: str = Depends(require_tenant), authorization: Optional[str] = Header(None)):
    _require_session(slug, authorization)
    with get_db() as conn:
        cid = _get_community_id(conn, slug)
        page = conn.execute(
            "SELECT style, palette FROM institutional_pages WHERE community_id = ?", (cid,)
        ).fetchone()
        sections = conn.execute(
            """SELECT id, section_type, order_index, is_active, content
               FROM page_sections WHERE community_id = ? ORDER BY order_index""",
            (cid,),
        ).fetchall()
    return {
        "style": page["style"] if page else "classic",
        "palette": page["palette"] if page else "verde",
        "sections": [{**dict(s), "content": json.loads(s["content"])} for s in sections],
    }


class StyleUpdate(BaseModel):
    style: str
    palette: str


@router.put("/page/style")
def update_style(body: StyleUpdate, slug: str = Depends(require_tenant), authorization: Optional[str] = Header(None)):
    _require_session(slug, authorization)
    if body.style not in STYLES:
        raise HTTPException(status_code=400, detail="Estilo inválido")
    if body.palette not in STYLES[body.style]["palettes"]:
        raise HTTPException(status_code=400, detail="Paleta inválida para este estilo")
    with get_db() as conn:
        cid = _get_community_id(conn, slug)
        conn.execute(
            "UPDATE institutional_pages SET style = ?, palette = ? WHERE community_id = ?",
            (body.style, body.palette, cid),
        )
    return {"ok": True}


# ── seções ────────────────────────────────────────────────────────────────────

class SectionCreate(BaseModel):
    section_type: str
    content: dict[str, Any] = {}


@router.post("/sections")
def add_section(body: SectionCreate, slug: str = Depends(require_tenant), authorization: Optional[str] = Header(None)):
    _require_session(slug, authorization)
    if body.section_type not in VALID_SECTION_TYPES:
        raise HTTPException(status_code=400, detail=f"Tipo inválido. Válidos: {VALID_SECTION_TYPES}")
    with get_db() as conn:
        cid = _get_community_id(conn, slug)
        count = conn.execute(
            "SELECT COUNT(*) as n FROM page_sections WHERE community_id = ?", (cid,)
        ).fetchone()["n"]
        if count >= SECTIONS_LIMIT:
            raise HTTPException(status_code=400, detail=f"Limite de {SECTIONS_LIMIT} seções atingido")
        max_order = conn.execute(
            "SELECT COALESCE(MAX(order_index), -1) as m FROM page_sections WHERE community_id = ?", (cid,)
        ).fetchone()["m"]
        row = conn.execute(
            """INSERT INTO page_sections (community_id, section_type, order_index, is_active, content)
               VALUES (?, ?, ?, 1, ?)""",
            (cid, body.section_type, max_order + 1, json.dumps(body.content, ensure_ascii=False)),
        )
        new_id = row.lastrowid
    return {"id": new_id, "section_type": body.section_type, "order_index": max_order + 1,
            "is_active": True, "content": body.content}


class SectionUpdate(BaseModel):
    content: dict[str, Any]


@router.put("/sections/{section_id}")
def update_section(section_id: int, body: SectionUpdate,
                   slug: str = Depends(require_tenant),
                   authorization: Optional[str] = Header(None)):
    _require_session(slug, authorization)
    with get_db() as conn:
        cid = _get_community_id(conn, slug)
        result = conn.execute(
            "UPDATE page_sections SET content = ? WHERE id = ? AND community_id = ?",
            (json.dumps(body.content, ensure_ascii=False), section_id, cid),
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Seção não encontrada")
    return {"ok": True}


class ReorderRequest(BaseModel):
    ids: list[int]


@router.put("/sections/reorder/batch")
def reorder_sections(body: ReorderRequest, slug: str = Depends(require_tenant), authorization: Optional[str] = Header(None)):
    _require_session(slug, authorization)
    with get_db() as conn:
        cid = _get_community_id(conn, slug)
        for index, section_id in enumerate(body.ids):
            conn.execute(
                "UPDATE page_sections SET order_index = ? WHERE id = ? AND community_id = ?",
                (index, section_id, cid),
            )
    return {"ok": True}


@router.patch("/sections/{section_id}/toggle")
def toggle_section(section_id: int, slug: str = Depends(require_tenant), authorization: Optional[str] = Header(None)):
    _require_session(slug, authorization)
    with get_db() as conn:
        cid = _get_community_id(conn, slug)
        result = conn.execute(
            "UPDATE page_sections SET is_active = NOT is_active WHERE id = ? AND community_id = ?",
            (section_id, cid),
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Seção não encontrada")
        row = conn.execute("SELECT is_active FROM page_sections WHERE id = ?", (section_id,)).fetchone()
    return {"is_active": bool(row["is_active"])}


@router.delete("/sections/{section_id}")
def delete_section(section_id: int, slug: str = Depends(require_tenant), authorization: Optional[str] = Header(None)):
    _require_session(slug, authorization)
    with get_db() as conn:
        cid = _get_community_id(conn, slug)
        result = conn.execute(
            "DELETE FROM page_sections WHERE id = ? AND community_id = ?", (section_id, cid)
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Seção não encontrada")
    return {"ok": True}


# ── imagens ───────────────────────────────────────────────────────────────────

@router.get("/images")
def list_images(slug: str = Depends(require_tenant), authorization: Optional[str] = Header(None)):
    _require_session(slug, authorization)
    with get_db() as conn:
        cid = _get_community_id(conn, slug)
        rows = conn.execute(
            """SELECT filename, size_bytes, alt_text, created_at
               FROM storage_usage WHERE community_id = ? ORDER BY created_at DESC""",
            (cid,),
        ).fetchall()
        images = []
        for r in rows:
            images.append({
                "filename": r["filename"],
                "url": f"/uploads/{r['filename']}",
                "size_bytes": r["size_bytes"],
                "size_kb": round(r["size_bytes"] / 1024, 1),
                "alt_text": r["alt_text"],
                "created_at": r["created_at"],
                "in_use": _is_image_in_use(conn, cid, r["filename"]),
            })
    return images


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    alt_text: str = Form(...),
    slug: str = Depends(require_tenant),
    authorization: Optional[str] = Header(None),
):
    _require_session(slug, authorization)

    if not alt_text.strip():
        raise HTTPException(status_code=422, detail="Texto alternativo é obrigatório")

    raw = await file.read()

    if len(raw) > UPLOAD_MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Arquivo muito grande. Máximo: {UPLOAD_MAX_BYTES // (1024*1024)} MB",
        )

    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Apenas imagens são permitidas")

    try:
        processed = _process_image(raw)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Não foi possível processar a imagem: {exc}")

    with get_db() as conn:
        cid = _get_community_id(conn, slug)
        used = conn.execute(
            "SELECT COALESCE(SUM(size_bytes), 0) as total FROM storage_usage WHERE community_id = ?",
            (cid,),
        ).fetchone()["total"]
        if used + len(processed) > STORAGE_LIMIT_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"Limite de armazenamento atingido ({STORAGE_LIMIT_BYTES // (1024*1024)} MB)",
            )

        filename = f"{slug}_{uuid.uuid4().hex[:10]}.webp"
        filepath = os.path.join(UPLOADS_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(processed)

        conn.execute(
            "INSERT INTO storage_usage (community_id, filename, size_bytes, alt_text) VALUES (?, ?, ?, ?)",
            (cid, filename, len(processed), alt_text.strip()),
        )

    return {
        "url": f"/uploads/{filename}",
        "filename": filename,
        "size_bytes": len(processed),
        "size_kb": round(len(processed) / 1024, 1),
        "alt_text": alt_text.strip(),
        "in_use": False,
    }


class AltTextUpdate(BaseModel):
    alt_text: str


@router.put("/images/{filename}/alt")
def update_alt_text(filename: str, body: AltTextUpdate,
                    slug: str = Depends(require_tenant),
                    authorization: Optional[str] = Header(None)):
    _require_session(slug, authorization)
    if not body.alt_text.strip():
        raise HTTPException(status_code=422, detail="Texto alternativo não pode ser vazio")
    with get_db() as conn:
        cid = _get_community_id(conn, slug)
        result = conn.execute(
            "UPDATE storage_usage SET alt_text = ? WHERE community_id = ? AND filename = ?",
            (body.alt_text.strip(), cid, filename),
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Imagem não encontrada")
    return {"ok": True}


@router.delete("/images/{filename}")
def delete_image(filename: str, slug: str = Depends(require_tenant), authorization: Optional[str] = Header(None)):
    _require_session(slug, authorization)
    with get_db() as conn:
        cid = _get_community_id(conn, slug)
        row = conn.execute(
            "SELECT id FROM storage_usage WHERE community_id = ? AND filename = ?",
            (cid, filename),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Imagem não encontrada")
        if _is_image_in_use(conn, cid, filename):
            raise HTTPException(
                status_code=409,
                detail="Imagem em uso por uma seção ou card — remova o uso antes de deletar",
            )
        conn.execute(
            "DELETE FROM storage_usage WHERE community_id = ? AND filename = ?",
            (cid, filename),
        )

    filepath = os.path.join(UPLOADS_DIR, filename)
    if os.path.exists(filepath):
        os.remove(filepath)

    return {"ok": True}


@router.get("/storage")
def get_storage_usage(slug: str = Depends(require_tenant), authorization: Optional[str] = Header(None)):
    _require_session(slug, authorization)
    with get_db() as conn:
        cid = _get_community_id(conn, slug)
        used = conn.execute(
            "SELECT COALESCE(SUM(size_bytes), 0) as total FROM storage_usage WHERE community_id = ?",
            (cid,),
        ).fetchone()["total"]
    return {
        "used_bytes": used,
        "limit_bytes": STORAGE_LIMIT_BYTES,
        "used_mb": round(used / (1024 * 1024), 2),
        "limit_mb": STORAGE_LIMIT_BYTES // (1024 * 1024),
        "percent": round((used / STORAGE_LIMIT_BYTES) * 100, 1),
    }
