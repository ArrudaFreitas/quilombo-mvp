import { useState } from 'react'
import { API } from '../../api'
import './LoginPage.css'

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

export default function LoginPage({ slug, communityName, onLogin }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [email, setEmail]         = useState(`admin.${slug}@example.com`)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Acesso negado'); return }
      onLogin(data.token, { email: data.email })
    } catch {
      setError('Não foi possível conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-avatar" style={{ background: slugColor(slug) }}>
          <span>{initials(communityName)}</span>
        </div>

        <h1 className="login-community">{communityName}</h1>
        <p className="login-subtitle">Acesso administrativo</p>

        <div className="login-divider" />

        <button className="google-btn" onClick={() => setModalOpen(true)}>
          <svg viewBox="0 0 24 24" className="google-icon" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Entrar com Google
        </button>

        <p className="login-disclaimer">
          Apenas administradores previamente autorizados têm acesso.
        </p>
      </div>

      {/* ── Mock Google OAuth Modal ── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => { setModalOpen(false); setError('') }}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <svg viewBox="0 0 24 24" width="24" height="24" aria-label="Google">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <div>
                <p className="modal-title">Fazer login</p>
                <p className="modal-domain">quilombo.org</p>
              </div>
            </div>

            <p className="modal-demo-notice">Modo demonstração — informe o e-mail autorizado</p>

            <form onSubmit={handleLogin} className="modal-form">
              <label className="modal-label" htmlFor="email">E-mail Google</label>
              <input
                id="email"
                type="email"
                className="modal-input"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                autoFocus
                required
              />
              {error && <p className="modal-error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => { setModalOpen(false); setError('') }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Verificando…' : 'Entrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
