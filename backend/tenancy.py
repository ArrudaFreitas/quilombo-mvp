"""Resolução do tenant (comunidade) a partir do subdomínio no Host header.

Substitui o antigo esquema de slug por path param. O nginx preserva o Host
original (kalunga.quilombo.localhost), e aqui extraímos o slug do subdomínio.
"""
from typing import Optional

from fastapi import Request, HTTPException

BASE_DOMAIN = "quilombo.localhost"


def _slug_from_host(host: Optional[str]) -> Optional[str]:
    if not host:
        return None
    host = host.split(":")[0].strip().lower()   # remove porta (:8080)
    if host == BASE_DOMAIN:
        return None
    suffix = "." + BASE_DOMAIN
    if host.endswith(suffix):
        sub = host[: -len(suffix)]
        if sub and "." not in sub:
            return sub
    return None


def require_tenant(request: Request) -> str:
    """Dependency: retorna o slug do tenant ou levanta 400 se na raiz."""
    slug = _slug_from_host(request.headers.get("host"))
    if slug is None:
        raise HTTPException(status_code=400, detail="Subdomínio de comunidade ausente")
    return slug
