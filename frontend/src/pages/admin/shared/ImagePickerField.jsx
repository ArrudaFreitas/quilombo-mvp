/**
 * Campo de imagem reutilizável — upload novo ou escolha da biblioteca.
 * Props:
 *   token, slug  — autenticação
 *   value        — { url: string|null, alt_text: string }
 *   onChange     — (newValue) => void
 *   label        — string (opcional)
 *   hint         — string (opcional)
 *   compact      — boolean — layout menor para uso em arrays (cards, etc.)
 */
import { useState, useEffect, useRef } from 'react'
import { API, apiFetch, authHeaders } from '../../../api'
import './ImagePickerField.css'

// ── Painel de upload ──────────────────────────────────────────────────────────
function UploadPanel({ token, slug, onUploaded, onCancel }) {
  const [file, setFile]         = useState(null)
  const [preview, setPreview]   = useState(null)
  const [altText, setAltText]   = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  function pickFile(f) {
    if (!f) return
    if (!f.type.startsWith('image/')) { setError('Apenas imagens são aceitas.'); return }
    if (f.size > 5 * 1024 * 1024)    { setError('Máximo 5 MB por imagem.'); return }
    setError('')
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleUpload() {
    if (!file || !altText.trim()) return
    setUploading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('alt_text', altText.trim())
      const res = await fetch(`${API}/api/admin/upload`, {
        method: 'POST', headers: authHeaders(token), body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Erro no upload')
      onUploaded(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="ipf-panel">
      {!file ? (
        <div
          className={`ipf-drop ${dragging ? 'drag' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]) }}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Arraste ou <u>clique para selecionar</u></span>
          <span className="ipf-drop-hint">PNG, JPG, WebP — máx. 5 MB</span>
          <input ref={inputRef} type="file" accept="image/*" style={{display:'none'}}
            onChange={e => pickFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="ipf-staged">
          <img src={preview} alt="Pré-visualização" />
          <button type="button" className="ipf-staged-rm" onClick={() => { URL.revokeObjectURL(preview); setFile(null); setPreview(null); setAltText('') }}>×</button>
        </div>
      )}

      {file && (
        <div className="ipf-alt-wrap">
          <label className="ipf-alt-label" htmlFor="ipf-alt">
            Texto alternativo <span className="req">*</span>
            <span className="a11y-chip">♿ Acessibilidade</span>
          </label>
          <p className="ipf-alt-info">
            Descreva o que a imagem mostra para pessoas que usam leitores de tela.
            Ex: <em>"Vista do território Kalunga ao pôr do sol"</em>.
          </p>
          <textarea id="ipf-alt" className="ipf-textarea" rows={2} value={altText}
            onChange={e => setAltText(e.target.value)}
            placeholder="Descreva o conteúdo visual..." />
        </div>
      )}

      {error && <p className="ipf-error">{error}</p>}

      <div className="ipf-actions">
        <button type="button" className="ipf-cancel" onClick={onCancel}>Cancelar</button>
        <button type="button" className="ipf-submit" onClick={handleUpload}
          disabled={uploading || !file || !altText.trim()}>
          {uploading ? 'Enviando…' : 'Usar esta imagem'}
        </button>
      </div>
    </div>
  )
}

// ── Painel da biblioteca ──────────────────────────────────────────────────────
function LibraryPanel({ token, slug, currentUrl, onPick, onCancel }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/api/admin/images`, { headers: authHeaders(token) })
      .then(setImages).finally(() => setLoading(false))
  }, [token, slug])

  if (loading) return (
    <div className="ipf-panel">
      <div className="ipf-lib-loading"><div className="spin" /></div>
      <div className="ipf-actions"><button type="button" className="ipf-cancel" onClick={onCancel}>Cancelar</button></div>
    </div>
  )

  if (!images.length) return (
    <div className="ipf-panel">
      <p className="ipf-lib-empty">Nenhuma imagem na biblioteca. Use a opção "Nova imagem" ou faça upload na aba <strong>Imagens</strong>.</p>
      <div className="ipf-actions"><button type="button" className="ipf-cancel" onClick={onCancel}>Cancelar</button></div>
    </div>
  )

  return (
    <div className="ipf-panel">
      <div className="ipf-lib-grid">
        {images.map(img => (
          <button key={img.filename} type="button"
            className={`ipf-lib-item ${img.url === currentUrl ? 'sel' : ''}`}
            onClick={() => onPick(img)} title={img.alt_text || img.filename}>
            <img src={`${API}${img.url}`} alt={img.alt_text || img.filename} />
            {img.url === currentUrl && <span className="ipf-lib-check">✓</span>}
          </button>
        ))}
      </div>
      <div className="ipf-actions">
        <button type="button" className="ipf-cancel" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}

// ── Componente público ────────────────────────────────────────────────────────
export default function ImagePickerField({ token, slug, value, onChange, label, hint, compact = false }) {
  const [mode, setMode] = useState(null) // null | 'upload' | 'library'
  const url    = value?.url     || null
  const altTxt = value?.alt_text || ''

  function handleUploaded(data) {
    onChange({ url: data.url, alt_text: data.alt_text })
    setMode(null)
  }

  function handleLibraryPick(img) {
    onChange({ url: img.url, alt_text: img.alt_text })
    setMode(null)
  }

  return (
    <div className={`ipf-root ${compact ? 'compact' : ''}`}>
      {label && <label className="ipf-field-label">{label}</label>}
      {hint  && !mode && <p className="ipf-field-hint">{hint}</p>}

      {url && !mode && (
        <div className="ipf-current">
          <img src={`${API}${url}`} alt={altTxt} />
          {altTxt && <p className="ipf-current-alt"><span>♿</span> {altTxt}</p>}
        </div>
      )}

      {!mode && (
        <div className="ipf-mode-btns">
          <button type="button" className="ipf-btn-mode" onClick={() => setMode('upload')}>
            {url ? 'Nova imagem' : 'Fazer upload'}
          </button>
          <button type="button" className="ipf-btn-mode" onClick={() => setMode('library')}>
            Biblioteca
          </button>
          {url && (
            <button type="button" className="ipf-btn-remove"
              onClick={() => onChange({ url: null, alt_text: '' })}>
              Remover
            </button>
          )}
        </div>
      )}

      {mode === 'upload'  && <UploadPanel  token={token} slug={slug} onUploaded={handleUploaded} onCancel={() => setMode(null)} />}
      {mode === 'library' && <LibraryPanel token={token} slug={slug} currentUrl={url} onPick={handleLibraryPick} onCancel={() => setMode(null)} />}
    </div>
  )
}
