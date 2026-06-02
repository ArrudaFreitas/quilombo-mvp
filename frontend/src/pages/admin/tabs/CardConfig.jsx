import { useState, useEffect, useRef } from 'react'
import { API, apiFetch, authHeaders } from '../../../api'
import './CardConfig.css'

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

const DESC_MAX = 200

// ── Caixa de instrução ────────────────────────────────────────────────────────
function InfoBox({ children }) {
  return <div className="info-box">{children}</div>
}

// ── Preview do card (espelho fiel da listagem) ────────────────────────────────
function CardPreview({ name, location, slug, imageUrl, description }) {
  return (
    <div className="card-preview-wrap">
      <p className="preview-label">Pré-visualização</p>
      <p className="preview-sub">
        É assim que sua comunidade aparecerá para visitantes na página inicial.
      </p>
      <div className="preview-card">
        <div className="preview-media">
          {imageUrl ? (
            <img src={`${API}${imageUrl}`} alt={`Imagem de ${name}`} />
          ) : (
            <div className="preview-placeholder" style={{ background: slugColor(slug) }}>
              <span>{initials(name)}</span>
            </div>
          )}
        </div>
        <div className="preview-body">
          <h3 className="preview-name">{name || '—'}</h3>
          <p className="preview-location">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            {location || '—'}
          </p>
          {description
            ? <p className="preview-desc">{description}</p>
            : <p className="preview-desc empty-desc">Nenhuma descrição adicionada ainda.</p>
          }
        </div>
      </div>
      <p className="preview-note">
        A imagem e a descrição são os únicos campos que você pode alterar aqui.
        Nome e localização são gerenciados pela equipe do Quilombo.org.
      </p>
    </div>
  )
}

// ── Upload inline de imagem ───────────────────────────────────────────────────
function ImageUploader({ token, slug, storage, onUploaded, onCancel }) {
  const [file, setFile]         = useState(null)
  const [previewUrl, setPreview] = useState(null)
  const [altText, setAltText]   = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  function pickFile(f) {
    if (!f) return
    if (!f.type.startsWith('image/')) { setError('Apenas imagens são aceitas.'); return }
    if (f.size > 5 * 1024 * 1024) { setError('A imagem deve ter no máximo 5 MB antes do processamento.'); return }
    setError('')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!file || !altText.trim()) return

    // valida espaço localmente antes de enviar
    if (storage && storage.percent >= 100) {
      setError(
        'Armazenamento cheio. Acesse a aba "Imagens", remova imagens que não estão em uso e tente novamente.'
      )
      return
    }

    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('alt_text', altText.trim())
      const res = await fetch(`${API}/api/admin/upload`, {
        method: 'POST',
        headers: authHeaders(token),
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 400 && data.detail?.includes('Limite')) {
          setError(
            `${data.detail}. Acesse a aba "Imagens", exclua imagens que não estão em uso e tente novamente.`
          )
        } else {
          throw new Error(data.detail || 'Erro no upload')
        }
        return
      }
      onUploaded(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const storagePct = storage?.percent ?? 0
  const storageWarn = storagePct >= 80

  return (
    <div className="img-uploader">
      {!file ? (
        <div
          className={`upload-drop ${dragging ? 'dragging' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]) }}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p>Arraste ou <span>clique para selecionar</span></p>
          <p className="drop-hint-small">PNG, JPG, WebP — máx. 5 MB</p>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => pickFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="upload-staged">
          <img src={previewUrl} alt="Pré-visualização" className="staged-thumb" />
          <button type="button" className="staged-remove" onClick={() => { URL.revokeObjectURL(previewUrl); setFile(null); setPreview(null); setAltText('') }}>×</button>
        </div>
      )}

      {file && (
        <div className="alt-field-wrap">
          <label className="field-label" htmlFor="card-alt">
            Texto alternativo
            <span className="required-mark">*</span>
            <span className="a11y-badge">♿ Acessibilidade</span>
          </label>
          <InfoBox>
            Descreva o que a imagem mostra para pessoas que usam leitores de tela
            (tecnologia usada por pessoas com deficiência visual).
            Exemplo: <em>"Vista panorâmica do território Kalunga ao pôr do sol"</em>.
          </InfoBox>
          <textarea
            id="card-alt"
            className="field-textarea small"
            rows={2}
            value={altText}
            onChange={e => setAltText(e.target.value)}
            placeholder="Descreva o conteúdo visual da imagem..."
          />
        </div>
      )}

      {storage && (
        <div className={`storage-mini ${storageWarn ? 'warn' : ''}`}>
          <div className="storage-mini-bar">
            <div className="storage-mini-fill" style={{ width: `${Math.min(storagePct, 100)}%`, background: storagePct >= 95 ? '#c0392b' : storagePct >= 80 ? '#d4900a' : 'var(--primary)' }} />
          </div>
          <span>{storage.used_mb.toFixed(1)} MB de {storage.limit_mb} MB usados</span>
          {storageWarn && storagePct < 100 && (
            <span className="storage-warn-text"> — pouco espaço restante</span>
          )}
        </div>
      )}

      {error && <p className="upload-err">{error}</p>}

      <div className="uploader-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleUpload}
          disabled={uploading || !file || !altText.trim()}
        >
          {uploading ? 'Enviando…' : 'Usar esta imagem'}
        </button>
      </div>
    </div>
  )
}

// ── Seletor da biblioteca ─────────────────────────────────────────────────────
function LibraryPicker({ token, slug, currentUrl, onPick, onCancel }) {
  const [images, setImages]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/api/admin/images`, { headers: authHeaders(token) })
      .then(setImages)
      .finally(() => setLoading(false))
  }, [token, slug])

  if (loading) return <div className="library-picker-loading"><div className="admin-spinner" /></div>

  if (images.length === 0) return (
    <div className="library-picker-empty">
      <p>Nenhuma imagem na biblioteca ainda.</p>
      <p className="hint">Faça um upload pela opção "Nova imagem" ou pela aba <strong>Imagens</strong>.</p>
      <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
    </div>
  )

  return (
    <div className="library-picker">
      <div className="lib-grid">
        {images.map(img => (
          <button
            key={img.filename}
            type="button"
            className={`lib-item ${img.url === currentUrl ? 'selected' : ''}`}
            onClick={() => onPick(img.url)}
            title={img.alt_text || img.filename}
          >
            <img src={`${API}${img.url}`} alt={img.alt_text || img.filename} />
            {img.url === currentUrl && (
              <span className="lib-check" aria-label="Selecionada">✓</span>
            )}
          </button>
        ))}
      </div>
      <div className="uploader-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}

// ── CardConfig ─────────────────────────────────────────────────────────────────
export default function CardConfig({ token, slug }) {
  const [card, setCard]       = useState(null)
  const [storage, setStorage] = useState(null)
  const [draft, setDraft]     = useState({ image_url: null, short_description: '' })
  // imageMode: null | 'upload' | 'library'
  const [imageMode, setImageMode] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [saveMsg, setSaveMsg] = useState('')  // 'ok' | 'error' | ''
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/admin/card`, { headers: authHeaders(token) }),
      apiFetch(`/api/admin/storage`, { headers: authHeaders(token) }),
    ]).then(([cardData, storageData]) => {
      setCard(cardData)
      setStorage(storageData)
      setDraft({ image_url: cardData.image_url, short_description: cardData.short_description || '' })
    }).finally(() => setLoading(false))
  }, [slug, token])

  function handleUploaded(imgData) {
    setDraft(d => ({ ...d, image_url: imgData.url }))
    setStorage(prev => prev ? {
      ...prev,
      used_bytes: prev.used_bytes + imgData.size_bytes,
      used_mb: (prev.used_bytes + imgData.size_bytes) / (1024 * 1024),
      percent: ((prev.used_bytes + imgData.size_bytes) / prev.limit_bytes) * 100,
    } : prev)
    setImageMode(null)
  }

  function handleLibraryPick(url) {
    setDraft(d => ({ ...d, image_url: url }))
    setImageMode(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg('')
    try {
      await apiFetch(`/api/admin/card`, {
        method: 'PUT',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      setCard(c => ({ ...c, ...draft }))
      setSaveMsg('ok')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch {
      setSaveMsg('error')
    } finally {
      setSaving(false)
    }
  }

  const descLeft = DESC_MAX - (draft.short_description?.length ?? 0)
  const isDirty  = card && (draft.image_url !== card.image_url || draft.short_description !== (card.short_description || ''))

  if (loading) return <div className="cc-loading"><div className="admin-spinner" /></div>

  return (
    <div className="card-config">

      {/* ── Intro ── */}
      <div className="cc-intro">
        <h2 className="cc-page-title">Configuração do card</h2>
        <p className="cc-page-desc">
          Gerencie como a sua comunidade aparece na página inicial do Quilombo.org.
          Visitantes veem um cartão com imagem, nome, localização e descrição curta
          antes de acessar a página completa da comunidade.
        </p>
      </div>

      <div className="cc-columns">

        {/* ── Coluna esquerda: formulário ── */}
        <div className="cc-form-col">

          {/* Campos fixos */}
          <section className="cc-section">
            <h3 className="cc-section-title">
              <span className="lock-icon" aria-hidden="true">🔒</span>
              Informações fixas
            </h3>
            <InfoBox>
              Nome e localização são dados oficiais registrados pela equipe do Quilombo.org
              e <strong>não podem ser alterados</strong> por aqui. Em caso de erro, entre
              em contato com o suporte.
            </InfoBox>
            <div className="locked-field">
              <label className="field-label">Nome da comunidade</label>
              <input type="text" className="field-input locked" value={card?.name ?? ''} readOnly aria-readonly="true" />
            </div>
            <div className="locked-field">
              <label className="field-label">Localização</label>
              <input type="text" className="field-input locked" value={card?.location ?? ''} readOnly aria-readonly="true" />
            </div>
          </section>

          {/* Imagem */}
          <section className="cc-section">
            <h3 className="cc-section-title">Imagem de capa</h3>
            <InfoBox>
              A imagem é o primeiro contato visual que um visitante tem com sua comunidade.
              Uma foto do território, das festas ou das tradições transmite identidade e
              desperta interesse. Recomendamos imagens em formato paisagem
              (mais largas que altas).
            </InfoBox>

            {/* imagem atual */}
            {draft.image_url && !imageMode && (
              <div className="current-image-wrap">
                <img
                  src={`${API}${draft.image_url}`}
                  alt="Imagem atual do card"
                  className="current-image-thumb"
                />
                {draft.image_url !== card?.image_url && (
                  <span className="unsaved-badge">Não salvo</span>
                )}
              </div>
            )}

            {/* botões de modo — só aparecem quando nenhum painel está aberto */}
            {!imageMode && (
              <div className="image-mode-btns">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setImageMode('upload')}
                >
                  {draft.image_url ? 'Nova imagem' : 'Fazer upload'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setImageMode('library')}
                >
                  Escolher da biblioteca
                </button>
              </div>
            )}

            {/* painel de upload */}
            {imageMode === 'upload' && (
              <ImageUploader
                token={token}
                slug={slug}
                storage={storage}
                onUploaded={handleUploaded}
                onCancel={() => setImageMode(null)}
              />
            )}

            {/* painel da biblioteca */}
            {imageMode === 'library' && (
              <LibraryPicker
                token={token}
                slug={slug}
                currentUrl={draft.image_url}
                onPick={handleLibraryPick}
                onCancel={() => setImageMode(null)}
              />
            )}

            {draft.image_url && !imageMode && (
              <button
                type="button"
                className="btn-remove-img"
                onClick={() => setDraft(d => ({ ...d, image_url: null }))}
              >
                Remover imagem
              </button>
            )}
          </section>

          {/* Descrição */}
          <section className="cc-section">
            <h3 className="cc-section-title">Descrição curta</h3>
            <InfoBox>
              A descrição curta é lida em poucos segundos. Use-a para apresentar o
              que há de mais especial na sua comunidade. Pense: <em>o que você diria
              a um desconhecido em apenas uma ou duas frases?</em> Quanto mais
              específica e honesta, melhor.
            </InfoBox>
            <div className="desc-field-wrap">
              <textarea
                className="field-textarea"
                rows={4}
                maxLength={DESC_MAX}
                value={draft.short_description}
                onChange={e => setDraft(d => ({ ...d, short_description: e.target.value }))}
                placeholder="Ex: Formada por descendentes de africanos escravizados, a comunidade preserva tradições centenárias às margens do Rio Maracaçumé."
              />
              <div className="desc-footer">
                <span className={`char-count ${descLeft <= 20 ? 'warn' : ''}`}>
                  {descLeft} caracteres restantes
                </span>
              </div>
            </div>
          </section>

          {/* Salvar */}
          <div className="cc-save-row">
            <InfoBox>
              Revise o pré-visualização antes de salvar. As alterações entram em
              vigor imediatamente e ficam visíveis para todos os visitantes.
            </InfoBox>
            <div className="save-actions">
              {saveMsg === 'ok' && (
                <span className="save-feedback ok">✓ Salvo com sucesso</span>
              )}
              {saveMsg === 'error' && (
                <span className="save-feedback error">Erro ao salvar. Tente novamente.</span>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !isDirty}
              >
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </div>
            {!isDirty && !saveMsg && (
              <p className="no-changes-hint">Nenhuma alteração pendente.</p>
            )}
          </div>
        </div>

        {/* ── Coluna direita: preview ── */}
        <div className="cc-preview-col">
          <div className="cc-preview-sticky">
            <CardPreview
              name={card?.name}
              location={card?.location}
              slug={slug}
              imageUrl={draft.image_url}
              description={draft.short_description}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
