import { useState, useEffect, useRef, useCallback } from 'react'
import { API, apiFetch, authHeaders } from '../../../api'
import './ImageLibrary.css'

const LIMIT_MB = 50

function StorageBar({ usedMb, limitMb, percent }) {
  const warn    = percent >= 80 && percent < 95
  const danger  = percent >= 95
  const barClass = danger ? 'bar-danger' : warn ? 'bar-warn' : 'bar-ok'

  return (
    <div className="storage-section">
      <div className="storage-header">
        <span className="storage-label">Armazenamento</span>
        <span className={`storage-numbers ${danger ? 'text-danger' : warn ? 'text-warn' : ''}`}>
          {usedMb.toFixed(1)} MB de {limitMb} MB
        </span>
      </div>
      <div className="storage-track">
        <div
          className={`storage-fill ${barClass}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <p className="storage-hint">
        {(limitMb - usedMb).toFixed(1)} MB disponíveis ({percent.toFixed(1)}% usado)
      </p>
    </div>
  )
}

function UploadZone({ token, slug, onUploaded, usedPercent }) {
  const [dragging, setDragging]   = useState(false)
  const [preview, setPreview]     = useState(null)   // { url, file }
  const [altText, setAltText]     = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const inputRef = useRef(null)

  function handleFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Apenas imagens são permitidas.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('A imagem deve ter no máximo 5 MB.'); return }
    setError('')
    setPreview({ url: URL.createObjectURL(file), file })
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function clearPreview() {
    if (preview?.url) URL.revokeObjectURL(preview.url)
    setPreview(null)
    setAltText('')
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!preview || !altText.trim()) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', preview.file)
      fd.append('alt_text', altText.trim())
      const res = await fetch(`${API}/api/admin/upload`, {
        method: 'POST',
        headers: authHeaders(token),
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Erro no upload')
      onUploaded(data)
      clearPreview()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="upload-section">
      <h3 className="section-title">Enviar imagem</h3>

      {!preview ? (
        <div
          className={`drop-zone ${dragging ? 'dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          aria-label="Área de upload. Clique ou arraste uma imagem."
        >
          <svg className="drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p className="drop-text">Arraste uma imagem ou <span>clique para selecionar</span></p>
          <p className="drop-hint">PNG, JPG, GIF, WebP — máximo 5 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        <form className="upload-preview" onSubmit={handleUpload}>
          <div className="preview-media">
            <img src={preview.url} alt="Pré-visualização" />
            <button type="button" className="preview-remove" onClick={clearPreview} aria-label="Remover imagem">
              ×
            </button>
          </div>

          <div className="alt-field">
            <label htmlFor="alt-text" className="alt-label">
              Texto alternativo
              <span className="alt-required">*</span>
              <span className="alt-a11y-badge" title="Usado como alt text para leitores de tela">
                ♿ Acessibilidade
              </span>
            </label>
            <p className="alt-hint">
              Descreva o conteúdo visual da imagem para pessoas que usam leitores de tela.
              Seja específico: "Vista aérea da aldeia Kalunga ao amanhecer" é melhor que "foto da comunidade".
            </p>
            <textarea
              id="alt-text"
              className="alt-textarea"
              value={altText}
              onChange={e => setAltText(e.target.value)}
              placeholder="Ex: Vista do território com casas de pau a pique e plantações ao redor"
              rows={3}
              required
            />
            <p className="alt-chars">{altText.length} caracteres</p>
          </div>

          {error && <p className="upload-error">{error}</p>}

          <div className="upload-actions">
            <button type="button" className="btn-ghost" onClick={clearPreview}>Cancelar</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={uploading || !altText.trim()}
            >
              {uploading ? 'Enviando…' : 'Enviar imagem'}
            </button>
          </div>
        </form>
      )}

      {error && !preview && <p className="upload-error" style={{ marginTop: '10px' }}>{error}</p>}
    </div>
  )
}

function ImageCard({ image, token, slug, onDeleted, onAltUpdated }) {
  const [editingAlt, setEditingAlt]   = useState(false)
  const [altDraft, setAltDraft]       = useState(image.alt_text)
  const [savingAlt, setSavingAlt]     = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [confirmDel, setConfirmDel]   = useState(false)
  const [error, setError]             = useState('')

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      await apiFetch(`/api/admin/images/${encodeURIComponent(image.filename)}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      })
      onDeleted(image.filename)
    } catch (err) {
      setError(err.message)
      setConfirmDel(false)
    } finally {
      setDeleting(false)
    }
  }

  async function handleSaveAlt(e) {
    e.preventDefault()
    if (!altDraft.trim()) return
    setSavingAlt(true)
    try {
      await apiFetch(`/api/admin/images/${encodeURIComponent(image.filename)}/alt`, {
        method: 'PUT',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ alt_text: altDraft.trim() }),
      })
      onAltUpdated(image.filename, altDraft.trim())
      setEditingAlt(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingAlt(false)
    }
  }

  return (
    <div className={`img-card ${image.in_use ? 'in-use' : ''}`}>
      <div className="img-thumb">
        <img src={`${API}${image.url}`} alt={image.alt_text || image.filename} loading="lazy" />
        {image.in_use && <span className="in-use-badge">Em uso</span>}
      </div>

      <div className="img-info">
        <p className="img-filename" title={image.filename}>{image.filename}</p>
        <p className="img-size">{image.size_kb} KB · WebP</p>

        {editingAlt ? (
          <form onSubmit={handleSaveAlt} className="alt-edit-form">
            <textarea
              className="alt-textarea small"
              value={altDraft}
              onChange={e => setAltDraft(e.target.value)}
              rows={2}
              autoFocus
            />
            <div className="alt-edit-actions">
              <button type="button" className="btn-ghost tiny" onClick={() => { setEditingAlt(false); setAltDraft(image.alt_text) }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary tiny" disabled={savingAlt || !altDraft.trim()}>
                {savingAlt ? '…' : 'Salvar'}
              </button>
            </div>
          </form>
        ) : (
          <button
            className="alt-display"
            onClick={() => setEditingAlt(true)}
            title="Clique para editar o texto alternativo"
          >
            <span className="alt-icon" aria-hidden="true">♿</span>
            <span className="alt-text-preview">
              {image.alt_text || <em>Sem texto alternativo — clique para adicionar</em>}
            </span>
          </button>
        )}

        {error && <p className="img-error">{error}</p>}
      </div>

      <div className="img-actions">
        {!confirmDel ? (
          <button
            className="btn-delete"
            onClick={() => image.in_use ? setError('Imagem em uso — remova das seções antes de deletar') : setConfirmDel(true)}
            disabled={deleting}
            title={image.in_use ? 'Imagem em uso' : 'Deletar imagem'}
            aria-label={`Deletar ${image.filename}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        ) : (
          <div className="confirm-del">
            <span>Deletar?</span>
            <button className="btn-del-yes" onClick={handleDelete} disabled={deleting}>
              {deleting ? '…' : 'Sim'}
            </button>
            <button className="btn-ghost tiny" onClick={() => setConfirmDel(false)}>Não</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ImageLibrary({ token, slug }) {
  const [images, setImages]     = useState([])
  const [storage, setStorage]   = useState(null)
  const [loading, setLoading]   = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [imgs, stor] = await Promise.all([
        apiFetch(`/api/admin/images`, { headers: authHeaders(token) }),
        apiFetch(`/api/admin/storage`, { headers: authHeaders(token) }),
      ])
      setImages(imgs)
      setStorage(stor)
    } finally {
      setLoading(false)
    }
  }, [token, slug])

  useEffect(() => { fetchAll() }, [fetchAll])

  function handleUploaded(newImage) {
    setImages(prev => [newImage, ...prev])
    setStorage(prev => prev ? {
      ...prev,
      used_bytes: prev.used_bytes + newImage.size_bytes,
      used_mb: (prev.used_bytes + newImage.size_bytes) / (1024 * 1024),
      percent: ((prev.used_bytes + newImage.size_bytes) / prev.limit_bytes) * 100,
    } : prev)
  }

  function handleDeleted(filename) {
    const img = images.find(i => i.filename === filename)
    setImages(prev => prev.filter(i => i.filename !== filename))
    if (img) {
      setStorage(prev => prev ? {
        ...prev,
        used_bytes: prev.used_bytes - img.size_bytes,
        used_mb: (prev.used_bytes - img.size_bytes) / (1024 * 1024),
        percent: ((prev.used_bytes - img.size_bytes) / prev.limit_bytes) * 100,
      } : prev)
    }
  }

  function handleAltUpdated(filename, newAlt) {
    setImages(prev => prev.map(i => i.filename === filename ? { ...i, alt_text: newAlt } : i))
  }

  return (
    <div className="image-library">
      {storage && (
        <StorageBar
          usedMb={storage.used_mb}
          limitMb={storage.limit_mb}
          percent={storage.percent}
        />
      )}

      <UploadZone
        token={token}
        slug={slug}
        onUploaded={handleUploaded}
        usedPercent={storage?.percent ?? 0}
      />

      <div className="library-section">
        <h3 className="section-title">
          Biblioteca
          {!loading && <span className="image-count">{images.length} imagem{images.length !== 1 ? 'ns' : ''}</span>}
        </h3>

        {loading ? (
          <div className="img-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="img-card skeleton-card">
                <div className="img-thumb skeleton-block" />
                <div className="img-info">
                  <div className="skeleton-line" style={{ width: '80%', height: '12px', marginBottom: '6px' }} />
                  <div className="skeleton-line" style={{ width: '40%', height: '10px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="library-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" width="40" height="40" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <p>Nenhuma imagem enviada ainda.</p>
          </div>
        ) : (
          <div className="img-grid">
            {images.map(img => (
              <ImageCard
                key={img.filename}
                image={img}
                token={token}
                slug={slug}
                onDeleted={handleDeleted}
                onAltUpdated={handleAltUpdated}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
