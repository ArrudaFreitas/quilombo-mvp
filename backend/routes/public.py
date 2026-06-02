import json
from fastapi import APIRouter, HTTPException, Query, Depends
from db import get_db
from tenancy import require_tenant

router = APIRouter(prefix="/api", tags=["public"])


@router.get("/communities")
def list_communities(name: str = Query(default="", alias="name")):
    """Listagem pública — lê de community_cards (sem filtro de tenant)."""
    with get_db() as conn:
        if name:
            rows = conn.execute(
                "SELECT * FROM community_cards WHERE lower(name) LIKE ?",
                (f"%{name.lower()}%",),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM community_cards").fetchall()
    return [dict(r) for r in rows]


@router.get("/community")
def get_community_page(slug: str = Depends(require_tenant)):
    """Dados completos da página institucional do tenant atual (vem do subdomínio)."""
    with get_db() as conn:
        community = conn.execute(
            "SELECT * FROM communities WHERE slug = ?", (slug,)
        ).fetchone()
        if not community:
            raise HTTPException(status_code=404, detail="Comunidade não encontrada")

        card = conn.execute(
            "SELECT * FROM community_cards WHERE community_slug = ?", (slug,)
        ).fetchone()

        page = conn.execute(
            "SELECT style, palette FROM institutional_pages WHERE community_id = ?",
            (community["id"],),
        ).fetchone()

        sections = conn.execute(
            """
            SELECT id, section_type, order_index, is_active, content
            FROM page_sections
            WHERE community_id = ?
            ORDER BY order_index
            """,
            (community["id"],),
        ).fetchall()

    return {
        "community": dict(community),
        "card": dict(card) if card else None,
        "page": dict(page) if page else {"style": "classic", "palette": "verde"},
        "sections": [
            {**dict(s), "content": json.loads(s["content"])}
            for s in sections
            if s["is_active"]
        ],
    }
