import { useState, useEffect, useRef } from 'react'
import { API, tenantUrl } from '../api'
import './Home.css'

// Gera cor de fundo determinística a partir do slug
const PLACEHOLDER_COLORS = [
  '#7A3020', '#3D6B35', '#1F4F72', '#6B4D1A',
  '#4D2A6B', '#1A6B5A', '#6B3A1A', '#2A4D6B',
]
function slugColor(slug) {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = slug.charCodeAt(i) + ((h << 5) - h)
  return PLACEHOLDER_COLORS[Math.abs(h) % PLACEHOLDER_COLORS.length]
}

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

// ── Card ─────────────────────────────────────────────────────────────────────

function CommunityCard({ community, style }) {
  const { community_slug, name, location, image_url, short_description } = community
  // Navegação entre subdomínios é full page load (cross-origin).
  const goToCommunity = () => { window.location.assign(tenantUrl(community_slug)) }

  return (
    <article
      className="card"
      style={style}
      onClick={goToCommunity}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && goToCommunity()}
      aria-label={`Ver comunidade ${name}`}
    >
      <div className="card-media">
        {image_url ? (
          <img src={`${API}${image_url}`} alt={name} loading="lazy" />
        ) : (
          <div
            className="card-placeholder"
            style={{ background: slugColor(community_slug) }}
            aria-hidden="true"
          >
            <span>{initials(name)}</span>
          </div>
        )}
      </div>

      <div className="card-body">
        <h2 className="card-name">{name}</h2>
        <p className="card-location">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
          {location}
        </p>
        {short_description && (
          <p className="card-desc">{short_description}</p>
        )}
      </div>

      <div className="card-arrow" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
    </article>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard({ style }) {
  return (
    <div className="card skeleton" style={style} aria-hidden="true">
      <div className="card-media skeleton-block" />
      <div className="card-body">
        <div className="skeleton-line" style={{ width: '70%', height: '22px', marginBottom: '10px' }} />
        <div className="skeleton-line" style={{ width: '45%', height: '13px', marginBottom: '14px' }} />
        <div className="skeleton-line" style={{ width: '100%', height: '13px', marginBottom: '7px' }} />
        <div className="skeleton-line" style={{ width: '80%', height: '13px' }} />
      </div>
    </div>
  )
}

// ── Home ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [query, setQuery]           = useState('')
  const [communities, setCommunities] = useState([])
  const [loading, setLoading]       = useState(true)
  const [mounted, setMounted]       = useState(false)
  const debounceRef = useRef(null)
  const inputRef    = useRef(null)

  useEffect(() => {
    setMounted(true)
    fetchCommunities('')
  }, [])

  useEffect(() => {
    if (!mounted) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchCommunities(query), query ? 300 : 0)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  async function fetchCommunities(name) {
    setLoading(true)
    try {
      const qs  = name ? `?name=${encodeURIComponent(name)}` : ''
      const res = await fetch(`${API}/api/communities${qs}`)
      setCommunities(await res.json())
    } catch {
      setCommunities([])
    } finally {
      setLoading(false)
    }
  }

  const hasResults = !loading && communities.length > 0
  const isEmpty    = !loading && communities.length === 0

  return (
    <div className="home">

      {/* ── Hero / Search ── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Plataforma quilombola
          </div>
          <h1 className="hero-title">
            Quilombos<br />
            <em>do Brasil</em>
          </h1>
          <p className="hero-sub">
            Conheça as comunidades que preservam a cultura e a história afro-brasileira.
          </p>

          <div className="search-wrap">
            <label htmlFor="search" className="sr-only">Buscar comunidade</label>
            <div className="search-field">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="search"
                ref={inputRef}
                type="search"
                placeholder="Buscar por nome..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoComplete="off"
              />
              {query && (
                <button
                  className="search-clear"
                  onClick={() => { setQuery(''); inputRef.current?.focus() }}
                  aria-label="Limpar busca"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="hero-divider" aria-hidden="true">
          <span />
          {!loading && (
            <span className="result-count">
              {communities.length} comunidade{communities.length !== 1 ? 's' : ''}
              {query ? ` para "${query}"` : ''}
            </span>
          )}
          <span />
        </div>
      </section>

      {/* ── Grid ── */}
      <main className="grid-wrap">
        {loading && (
          <div className="grid">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonCard key={i} style={{ animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>
        )}

        {hasResults && (
          <div className="grid">
            {communities.map((c, i) => (
              <CommunityCard
                key={c.id}
                community={c}
                style={{ animationDelay: `${i * 0.07}s` }}
              />
            ))}
          </div>
        )}

        {isEmpty && (
          <div className="empty">
            <div className="empty-symbol" aria-hidden="true">◎</div>
            <p className="empty-title">Nenhuma comunidade encontrada</p>
            {query && (
              <p className="empty-hint">
                Tente buscar por outro nome ou{' '}
                <button className="link-btn" onClick={() => setQuery('')}>limpe a busca</button>.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
