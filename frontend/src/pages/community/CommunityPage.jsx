import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { API, apiFetch, getTenant, rootUrl } from '../../api'
import { SCHEMA_BY_TYPE } from '../admin/tabs/sectionSchemas'
import '../../styles/institutional/tokens.css'
import '../../styles/institutional/palettes.css'
import '../../styles/institutional/style-uniao.css'
import '../../styles/institutional/style-raizes.css'
import './CommunityPage.css'

// ── Utilitários ───────────────────────────────────────────────────────────────

function getNavLabel(section) {
  const c = section.content
  const raw = c.kicker || c.label || ''
  if (raw && raw.length <= 25) return raw
  return SCHEMA_BY_TYPE[section.section_type]?.label || section.section_type
}

function secId(index) { return `sec-${index}` }

// ── SVGs reutilizáveis ────────────────────────────────────────────────────────

const LeafIcon = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 21c0-8 6-14 14-15-1 9-7 15-14 15z"/>
    <path d="M9 17c2.5-3 5-5 8-6"/>
  </svg>
)

const PhIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 16l5-5 4 4 4-5 5 6M3 19h18"/>
    <circle cx="8" cy="8" r="1.5"/>
  </svg>
)

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="9" r="3.4"/>
    <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/>
  </svg>
)

const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21s7-6.3 7-11a7 7 0 0 0-14 0c0 4.7 7 11 7 11z"/>
    <circle cx="12" cy="10" r="2.5"/>
  </svg>
)

const SunIcon = () => (
  <svg className="sun" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
    <circle cx="100" cy="100" r="42"/>
    <g strokeLinecap="round">
      <path d="M100 18v26M100 156v26M18 100h26M156 100h26M42 42l18 18M140 140l18 18M158 42l-18 18M60 140l-18 18"/>
    </g>
  </svg>
)

// Emblema geométrico (Estilo Raízes)
const Emblema = ({ className = '' }) => (
  <svg className={`emblema ${className}`} viewBox="0 0 120 150" aria-hidden="true">
    <polygon points="60,6 82,40 38,40" fill="var(--accent)"/>
    <rect x="54" y="36" width="12" height="14" fill="currentColor"/>
    <circle cx="60" cy="64" r="16" fill="currentColor"/>
    <circle cx="60" cy="64" r="6.5" fill="var(--accent)"/>
    <polygon points="30,96 18,80 42,80" fill="currentColor"/>
    <polygon points="90,96 78,80 102,80" fill="currentColor"/>
    <rect x="20" y="96" width="80" height="12" fill="currentColor"/>
    <rect x="40" y="116" width="40" height="10" fill="var(--accent)"/>
    <rect x="52" y="126" width="16" height="18" fill="currentColor"/>
  </svg>
)

// Imagem real ou placeholder
function ImgOrPh({ image, className = '', style: inlineStyle }) {
  if (image?.url) {
    return <img src={`${API}${image.url}`} alt={image.alt_text || ''} className={className} style={inlineStyle} />
  }
  return (
    <div className={`ph ${className}`} style={inlineStyle} aria-hidden="true">
      <PhIcon />
    </div>
  )
}

// ── Seções ────────────────────────────────────────────────────────────────────

function HeroSection({ content, id, style }) {
  const isRaizes = style === 'raizes'

  if (isRaizes) return (
    <section id={id} className="hero" aria-labelledby={`${id}-t`}>
      <div className="faixa" aria-hidden="true" />
      <div className="wrap">
        <Emblema className="em-big" />
        {content.kicker && <span className="kicker">{content.kicker}</span>}
        <h1 id={`${id}-t`}>{content.title || 'Nossa comunidade'}</h1>
        {content.tagline && <p className="tagline">{content.tagline}</p>}
        <div className="cta">
          {content.cta_primary && (
            <a className="btn btn-primary" href={`#sec-1`}>
              {content.cta_primary}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </a>
          )}
          {content.cta_secondary && <a className="btn btn-ghost" href="#sec-3">{content.cta_secondary}</a>}
        </div>
        <div className="hero-img">
          <div className="frame">
            <ImgOrPh image={content.image} className="duo" style={{width:'100%',height:'100%'}} />
          </div>
          {content.selo && <span className="hero-selo">{content.selo}</span>}
        </div>
      </div>
    </section>
  )

  return (
    <section id={id} className="hero" aria-labelledby={`${id}-t`}>
      <SunIcon />
      <div className="wrap">
        <div className="hero-txt">
          {content.kicker && <span className="kicker">{content.kicker}</span>}
          <h1 id={`${id}-t`}>{content.title || 'Nossa comunidade'}</h1>
          {content.tagline && <p className="tagline">{content.tagline}</p>}
          <div className="hero-cta">
            {content.cta_primary && (
              <a className="btn btn-primary" href="#sec-1">
                {content.cta_primary}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </a>
            )}
            {content.cta_secondary && <a className="btn btn-ghost" href="#sec-3">{content.cta_secondary}</a>}
          </div>
        </div>
        <div className="hero-art">
          <div className="arch">
            <ImgOrPh image={content.image} style={{width:'100%',height:'100%'}} />
          </div>
          {content.selo && <div className="selo">{content.selo}</div>}
        </div>
      </div>
    </section>
  )
}

function DescShortSection({ content, id, style }) {
  const isRaizes = style === 'raizes'

  return (
    <section id={id} className={`curta blk ${isRaizes ? 'fill-primary' : ''}`} aria-labelledby={`${id}-t`}>
      <div className="wrap">
        {isRaizes ? (
          <div className="rv">
            <Emblema className="em-c on" />
            {content.label && <span className="lbl">{content.label}</span>}
            <h2 id={`${id}-t`} className="sr-only">Quem somos</h2>
            <p>{content.body}</p>
          </div>
        ) : (
          <div className="panel rv">
            {content.portrait?.url ? (
              <div className="portrait">
                <img src={`${API}${content.portrait.url}`} alt={content.portrait.alt_text || ''} style={{width:'100%',height:'100%',objectFit:'cover'}} />
              </div>
            ) : (
              <div className="portrait"><div className="ph"><PersonIcon /></div></div>
            )}
            {content.label && <span className="ktag">{content.label}</span>}
            <h2 id={`${id}-t`} className="sr-only">Quem somos</h2>
            <p>{content.body}</p>
          </div>
        )}
      </div>
    </section>
  )
}

function DescLongSection({ content, id }) {
  return (
    <section id={id} className="longa blk" aria-labelledby={`${id}-t`}>
      <div className="wrap">
        <header className="head center rv">
          {content.kicker && <span className="kicker">{content.kicker}</span>}
          <h2 id={`${id}-t`}>{content.title}</h2>
          <span className="fil" aria-hidden="true" />
        </header>
        <div className="read rv">
          {content.blocks?.map((block, i) => {
            switch (block.type) {
              case 'paragraph':
                return <p key={i}>{block.text}</p>
              case 'heading':
                return <h3 key={i}>{block.text}</h3>
              case 'image':
                return (
                  <figure key={i}>
                    <div className="arch">
                      <ImgOrPh image={block.image} style={{width:'100%',height:'100%'}} />
                    </div>
                    {block.caption && <figcaption>{block.caption}</figcaption>}
                  </figure>
                )
              case 'quote':
                return (
                  <blockquote key={i}>
                    <span className="qm" aria-hidden="true">"</span>
                    <p>{block.text}</p>
                    {block.cite && <cite>— {block.cite}</cite>}
                  </blockquote>
                )
              default:
                return null
            }
          })}
        </div>
      </div>
    </section>
  )
}

function CarouselSection({ content, id }) {
  const trackRef = useRef(null)
  function slideWidth() {
    const slide = trackRef.current?.querySelector('.slide')
    return slide ? slide.getBoundingClientRect().width + 24 : 300
  }
  return (
    <section id={id} className="blk alt" aria-labelledby={`${id}-t`}>
      <div className="wrap">
        <div className="car-top rv">
          <header className="head" style={{marginBottom:0}}>
            {content.kicker && <span className="kicker">{content.kicker}</span>}
            <h2 id={`${id}-t`}>{content.title}</h2>
            <span className="fil" aria-hidden="true" />
          </header>
          <div className="car-ctrl">
            <button className="btn btn-ico" onClick={() => trackRef.current?.scrollBy({left: -slideWidth(), behavior:'smooth'})} aria-label="Anterior">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
            </button>
            <button className="btn btn-ico" onClick={() => trackRef.current?.scrollBy({left: slideWidth(), behavior:'smooth'})} aria-label="Próxima">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
            </button>
          </div>
        </div>
        <div className="track rv" ref={trackRef} tabIndex={0} role="group" aria-label="Galeria">
          {content.cards?.map((card, i) => (
            <figure key={i} className="slide">
              <div className="card">
                <ImgOrPh image={card.image} className="ph duo" style={{aspectRatio:'4/3'}} />
                <div className="cap">
                  <h3>{card.title}</h3>
                  {card.subtitle && <p>{card.subtitle}</p>}
                </div>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

function EventsSection({ content, id }) {
  return (
    <section id={id} className="blk" aria-labelledby={`${id}-t`}>
      <div className="wrap">
        <header className="head rv">
          {content.kicker && <span className="kicker">{content.kicker}</span>}
          <h2 id={`${id}-t`}>{content.title}</h2>
        </header>
        <div className="ev-list">
          {content.events?.map((ev, i) => (
            <div key={i} className="ev rv">
              <div className="date">
                <span className="d">{ev.day}</span>
                <time className="m" dateTime={ev.datetime}>{ev.month}</time>
              </div>
              <div className="info">
                <h3>{ev.title}</h3>
                {ev.description && <p>{ev.description}</p>}
              </div>
              <span className="go" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TimelineSection({ content, id }) {
  return (
    <section id={id} className="blk alt" aria-labelledby={`${id}-t`}>
      <div className="wrap">
        <header className="head rv">
          {content.kicker && <span className="kicker">{content.kicker}</span>}
          <h2 id={`${id}-t`}>{content.title}</h2>
        </header>
        <div className="tl">
          {content.entries?.map((entry, i) => (
            <div key={i} className={`marco rv ${entry.is_recent ? 'rec' : ''}`}>
              <div className="ano">{entry.year}</div>
              <div className="body">
                <h3>{entry.title}</h3>
                {entry.description && <p>{entry.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function LocationSection({ content, id }) {
  return (
    <section id={id} className="blk" aria-labelledby={`${id}-t`}>
      <div className="wrap">
        <header className="head rv">
          {content.kicker && <span className="kicker">{content.kicker}</span>}
          <h2 id={`${id}-t`}>{content.title}</h2>
        </header>
        <div className="loc rv">
          <div className="arch frame">
            <ImgOrPh image={content.map_image} style={{width:'100%',height:'100%'}} />
          </div>
          <div className="loc-card">
            <h3>{content.place_name}</h3>
            {content.address && (
              <address>
                {content.address.split('\n').map((line, i) => (
                  <span key={i}>{line}{i < content.address.split('\n').length - 1 && <br/>}</span>
                ))}
              </address>
            )}
            {content.pills?.length > 0 && (
              <div className="pills">
                {content.pills.map((p, i) => <span key={i} className="pill">{p}</span>)}
              </div>
            )}
            {content.cta_label && (
              <a className="btn btn-primary" href="https://maps.google.com" target="_blank" rel="noopener noreferrer">
                {content.cta_label}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

const SECTION_COMPONENTS = {
  hero:              HeroSection,
  description_short: DescShortSection,
  description_long:  DescLongSection,
  carousel:          CarouselSection,
  events:            EventsSection,
  timeline:          TimelineSection,
  location:          LocationSection,
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header({ community, sections, style, activeId, darkMode, onToggleDark }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isRaizes = style === 'raizes'

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMenuOpen(false)
  }

  const navSections = sections.map((s, i) => ({
    id: secId(i),
    label: s.section_type === 'hero' ? 'Início' : getNavLabel(s),
    type: s.section_type,
  }))

  return (
    <header className={`ip-header ${isRaizes ? 'style-raizes' : ''}`}>
      <div className="ip-header-inner wrap">
        {/* Brand */}
        <a className="ip-brand" href={`#${secId(0)}`} onClick={e => { e.preventDefault(); scrollTo(secId(0)) }}
           aria-label={`${community.name} — início`}>
          {isRaizes
            ? <Emblema className="ip-brand-icon" />
            : <LeafIcon className="ip-brand-icon" />
          }
          <span>{community.name}</span>
        </a>

        {/* Mobile toggle */}
        <button className="ip-hamburger" aria-expanded={menuOpen} aria-controls="ip-nav"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setMenuOpen(o => !o)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16"/>
          </svg>
        </button>

        {/* Nav */}
        <nav id="ip-nav" className={`ip-nav ${menuOpen ? 'open' : ''}`} aria-label="Principal">
          <ul>
            {navSections.map(sec => (
              <li key={sec.id}>
                <a
                  href={`#${sec.id}`}
                  aria-current={activeId === sec.id ? 'true' : undefined}
                  onClick={e => { e.preventDefault(); scrollTo(sec.id) }}
                >
                  {sec.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Controls */}
        <div className="ip-header-controls">
          <a href={rootUrl()} className="ip-back-link" title="Voltar à listagem">
            ← Todas as comunidades
          </a>
          <button className="ip-theme-btn" onClick={onToggleDark}
            aria-pressed={darkMode} aria-label="Alternar modo claro/escuro">
            {darkMode
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
            }
          </button>
        </div>
      </div>
      {isRaizes && <div className="ip-header-accent-bar" aria-hidden="true" />}
    </header>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer({ community, style }) {
  const isRaizes = style === 'raizes'
  const year = new Date().getFullYear()

  return (
    <>
      {!isRaizes && (
        <svg className="scallop" viewBox="0 0 1200 48" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 48 C 150 0 300 0 450 24 S 750 48 900 24 1050 0 1200 24 L1200 48 Z" fill="currentColor"/>
        </svg>
      )}
      <footer className={`ip-footer ${isRaizes ? 'style-raizes' : ''}`}>
        <div className="wrap">
          <div className="ip-footer-cols">
            <div>
              <h4>A plataforma</h4>
              <div className="ip-footer-brand">
                <LeafIcon className="ip-footer-logo" />
                Quilombo.org
              </div>
              <p>Presença digital gratuita para comunidades quilombolas brasileiras. A comunidade é dona da própria história.</p>
            </div>
            <div>
              <h4>Navegar</h4>
              <ul>
                <li><a href={rootUrl()}>Todas as comunidades</a></li>
                <li><Link to="/">Página do {community.name}</Link></li>
                <li><Link to="/admin">Área administrativa</Link></li>
              </ul>
            </div>
            <div>
              <h4>Contato</h4>
              <ul>
                <li><a href="mailto:contato@quilombo.org">contato@quilombo.org</a></li>
                <li><a href="#">Sobre o projeto</a></li>
                <li><a href="#">Acessibilidade</a></li>
                <li><a href="#">Política de privacidade</a></li>
              </ul>
            </div>
          </div>
          <p className="ip-footer-copy">
            © {year} Plataforma Quilombo.org · Conteúdo da comunidade {community.name} · Feito em comunidade.
          </p>
        </div>
      </footer>
    </>
  )
}

// ── CommunityPage ─────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const slug = getTenant()
  const [pageData, setPageData] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('q-theme') === 'dark' } catch { return false }
  })

  useEffect(() => {
    apiFetch(`/api/community`)
      .then(setPageData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug])

  // Scroll-spy
  useEffect(() => {
    if (!pageData) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActiveId(e.target.id) })
      },
      { rootMargin: '-35% 0px -35% 0px' }
    )
    pageData.sections.forEach((_, i) => {
      const el = document.getElementById(secId(i))
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [pageData])

  // Revelar no scroll
  useEffect(() => {
    if (!pageData) return
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); observer.unobserve(e.target) } }),
      { rootMargin: '0px 0px -10% 0px' }
    )
    document.querySelectorAll('.ip .rv').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [pageData])

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    try { localStorage.setItem('q-theme', next ? 'dark' : 'light') } catch {}
  }

  if (loading) return (
    <div className="cp-loading">
      <div className="cp-spinner" />
    </div>
  )

  if (error || !pageData) return (
    <div className="cp-error">
      <p>Comunidade não encontrada.</p>
      <a href={rootUrl()}>← Voltar à listagem</a>
    </div>
  )

  const { community, page, sections } = pageData
  const style   = page?.style   || 'uniao'
  const palette = page?.palette || 'verde'

  return (
    <div
      className="ip"
      data-style={style}
      data-palette={palette}
      data-theme={darkMode ? 'dark' : 'light'}
    >
      <a className="cp-skip" href={`#${secId(0)}`}>Pular para o conteúdo</a>

      <Header
        community={community}
        sections={sections}
        style={style}
        activeId={activeId}
        darkMode={darkMode}
        onToggleDark={toggleDark}
      />

      <main id="conteudo">
        {sections.map((section, i) => {
          const Component = SECTION_COMPONENTS[section.section_type]
          if (!Component) return null
          return (
            <Component
              key={section.id}
              content={section.content}
              id={secId(i)}
              style={style}
            />
          )
        })}
      </main>

      <Footer community={community} style={style} />
    </div>
  )
}
