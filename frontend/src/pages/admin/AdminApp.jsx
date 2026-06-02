import { useState, useEffect } from 'react'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import { apiFetch, getTenant, BASE_DOMAIN } from '../../api'
import LoginPage from './LoginPage'
import ImageLibrary from './tabs/ImageLibrary'
import CardConfig from './tabs/CardConfig'
import PageConfig from './tabs/PageConfig'
import './AdminApp.css'

const PLACEHOLDER_COLORS = [
  '#7A3020','#3D6B35','#1F4F72','#6B4D1A',
  '#4D2A6B','#1A6B5A','#6B3A1A','#2A4D6B',
]
function slugColor(slug) {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = slug.charCodeAt(i) + ((h << 5) - h)
  return PLACEHOLDER_COLORS[Math.abs(h) % PLACEHOLDER_COLORS.length]
}
function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

const TABS = [
  { id: 'card',   label: 'Comunidade' },
  { id: 'page',   label: 'Página' },
  { id: 'images', label: 'Imagens' },
]

export default function AdminApp() {
  const slug = getTenant()
  const { token, user, loading, login, logout, isAuthenticated } = useAdminAuth(slug)
  const [communityName, setCommunityName] = useState(slug)
  const [activeTab, setActiveTab]         = useState('card')

  useEffect(() => {
    apiFetch(`/api/community`)
      .then(data => setCommunityName(data.community.name))
      .catch(() => {})
  }, [slug])

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <LoginPage
        slug={slug}
        communityName={communityName}
        onLogin={login}
      />
    )
  }

  return (
    <div className="admin-app">
      {/* ── Top bar ── */}
      <header className="admin-topbar">
        <div className="admin-brand">
          <div className="admin-avatar" style={{ background: slugColor(slug) }}>
            <span>{initials(communityName)}</span>
          </div>
          <div>
            <p className="admin-community-name">{communityName}</p>
            <p className="admin-slug">{slug}.{BASE_DOMAIN}/admin</p>
          </div>
        </div>

        <div className="admin-user">
          <span className="admin-email">{user?.email}</span>
          <button className="btn-logout" onClick={logout}>Sair</button>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="admin-tabs-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <main className="admin-content">
        {activeTab === 'card'   && <CardConfig   token={token} slug={slug} />}
        {activeTab === 'page'   && <PageConfig   token={token} slug={slug} />}
        {activeTab === 'images' && <ImageLibrary token={token} slug={slug} />}
      </main>
    </div>
  )
}
