import { useState, useEffect } from 'react'
import { API } from '../api'

export function useAdminAuth(slug) {
  const key = `admin_token_${slug}`
  const [token, setToken] = useState(() => localStorage.getItem(key))
  const [user, setUser]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setUser(data)
        else {
          localStorage.removeItem(key)
          setToken(null)
        }
      })
      .catch(() => { localStorage.removeItem(key); setToken(null) })
      .finally(() => setLoading(false))
  }, [token, slug])

  function login(newToken, userData) {
    localStorage.setItem(key, newToken)
    setToken(newToken)
    setUser(userData)
  }

  function logout() {
    fetch(`${API}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    localStorage.removeItem(key)
    setToken(null)
    setUser(null)
  }

  return { token, user, loading, login, logout, isAuthenticated: !!token && !!user }
}
