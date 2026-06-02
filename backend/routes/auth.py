import uuid
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional
from db import get_db
from tenancy import require_tenant

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Sessões em memória — adequado para demo
_sessions: dict[str, dict] = {}


def get_current_admin(
    slug: str = Depends(require_tenant),
    authorization: Optional[str] = Header(None),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token ausente")
    token = authorization.removeprefix("Bearer ").strip()
    session = _sessions.get(token)
    # session["slug"] != slug bloqueia replay de token entre subdomínios
    if not session or session["slug"] != slug:
        raise HTTPException(status_code=401, detail="Sessão inválida")
    return session


class LoginRequest(BaseModel):
    email: str


@router.post("/login")
def login(body: LoginRequest, slug: str = Depends(require_tenant)):
    """
    Mock do callback Google OAuth.
    O frontend exibe o botão "Entrar com Google"; ao clicar, abre um modal
    que simula o retorno do OAuth enviando o email selecionado.
    O tenant vem do subdomínio (Host header).
    """
    with get_db() as conn:
        community = conn.execute(
            "SELECT id FROM communities WHERE slug = ?", (slug,)
        ).fetchone()
        if not community:
            raise HTTPException(status_code=404, detail="Comunidade não encontrada")

        admin = conn.execute(
            "SELECT id FROM admins WHERE community_id = ? AND email = ?",
            (community["id"], body.email.lower().strip()),
        ).fetchone()
        if not admin:
            raise HTTPException(status_code=403, detail="Email não autorizado para esta comunidade")

    token = str(uuid.uuid4())
    _sessions[token] = {
        "token": token,
        "email": body.email.lower().strip(),
        "slug": slug,
        "community_id": community["id"],
    }
    return {"token": token, "email": body.email.lower().strip()}


@router.get("/me")
def me(session: dict = Depends(get_current_admin)):
    return {"email": session["email"], "slug": session["slug"]}


@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        _sessions.pop(token, None)
    return {"ok": True}
