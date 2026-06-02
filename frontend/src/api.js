// Mesma origem: tudo passa pelo nginx, que roteia /api e /uploads ao backend.
// O Host (subdomínio) carrega o tenant — não há mais slug na URL.
export const API = ''

export const BASE_DOMAIN = 'quilombo.localhost'

/** Slug do tenant a partir do subdomínio atual, ou null na raiz. */
export function getTenant() {
  const host = window.location.hostname
  if (host === BASE_DOMAIN) return null
  const suffix = '.' + BASE_DOMAIN
  if (host.endsWith(suffix)) {
    const sub = host.slice(0, -suffix.length)
    if (sub && !sub.includes('.')) return sub
  }
  return null
}

function portPart() {
  const p = window.location.port
  return (p && p !== '80') ? `:${p}` : ''   // mantém :8080
}

/** URL absoluta para o subdomínio de uma comunidade (navegação cross-origin). */
export function tenantUrl(slug) {
  return `${window.location.protocol}//${slug}.${BASE_DOMAIN}${portPart()}`
}

/** URL absoluta da raiz (listagem). */
export function rootUrl() {
  return `${window.location.protocol}//${BASE_DOMAIN}${portPart()}`
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Erro desconhecido')
  }
  return res.json()
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}
