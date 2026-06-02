import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { getTenant } from './api'
import Home from './pages/Home'
import AdminApp from './pages/admin/AdminApp'
import CommunityPage from './pages/community/CommunityPage'

export default function App() {
  const tenant = getTenant()

  // Raiz (quilombo.localhost): apenas a listagem.
  if (!tenant) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    )
  }

  // Subdomínio (kalunga.quilombo.localhost): página institucional + admin.
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CommunityPage />} />
        <Route path="/admin" element={<AdminApp />} />
        <Route path="*" element={<CommunityPage />} />
      </Routes>
    </BrowserRouter>
  )
}
