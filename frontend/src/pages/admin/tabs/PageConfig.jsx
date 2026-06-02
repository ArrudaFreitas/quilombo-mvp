import { useState, useEffect, useCallback } from 'react'
import { apiFetch, authHeaders } from '../../../api'
import { SECTION_SCHEMAS, SCHEMA_BY_TYPE, getDefaultContent } from './sectionSchemas'
import { STYLES, PALETTES, getPalettesForStyle } from '../../../config/pageStyles'
import ImagePickerField from '../shared/ImagePickerField'
import './PageConfig.css'

const SECTIONS_LIMIT = 20

// ── Helpers ───────────────────────────────────────────────────────────────────
let _tmpId = 0
function tmpId() { return `_new_${++_tmpId}` }

function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b) }

// ── Renderizadores de campo ───────────────────────────────────────────────────

function InfoTip({ children }) {
  return <p className="pc-tip">{children}</p>
}

function TextField({ field, value, onChange }) {
  return (
    <div className="pc-field">
      <label className="pc-label">
        {field.label}
        {field.required && <span className="pc-req">*</span>}
      </label>
      {field.hint && <InfoTip>{field.hint}</InfoTip>}
      <input
        className="pc-input"
        type="text"
        value={value || ''}
        maxLength={field.maxLength}
        placeholder={field.placeholder || ''}
        onChange={e => onChange(e.target.value)}
      />
      {field.maxLength && (
        <span className="pc-counter">{(value || '').length}/{field.maxLength}</span>
      )}
    </div>
  )
}

function TextareaField({ field, value, onChange }) {
  return (
    <div className="pc-field">
      <label className="pc-label">
        {field.label}
        {field.required && <span className="pc-req">*</span>}
      </label>
      {field.hint && <InfoTip>{field.hint}</InfoTip>}
      <textarea
        className="pc-textarea"
        rows={4}
        value={value || ''}
        maxLength={field.maxLength}
        placeholder={field.placeholder || ''}
        onChange={e => onChange(e.target.value)}
      />
      {field.maxLength && (
        <span className="pc-counter">{(value || '').length}/{field.maxLength}</span>
      )}
    </div>
  )
}

function CheckboxField({ field, value, onChange }) {
  return (
    <label className="pc-checkbox-label">
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
      {field.label}
    </label>
  )
}

function PillsField({ field, value = [], onChange }) {
  function update(i, v) { const n = [...value]; n[i] = v; onChange(n) }
  function remove(i)    { onChange(value.filter((_, idx) => idx !== i)) }
  function add()        { if (value.length < (field.maxItems || 6)) onChange([...value, '']) }

  return (
    <div className="pc-field">
      <label className="pc-label">{field.label}</label>
      {field.hint && <InfoTip>{field.hint}</InfoTip>}
      <div className="pc-pills-list">
        {value.map((pill, i) => (
          <div key={i} className="pc-pill-row">
            <input className="pc-input" type="text" value={pill}
              placeholder={field.placeholder || 'Texto da etiqueta'}
              onChange={e => update(i, e.target.value)} />
            <button type="button" className="pc-arr-btn rm" onClick={() => remove(i)} aria-label="Remover">✕</button>
          </div>
        ))}
      </div>
      {value.length < (field.maxItems || 6) && (
        <button type="button" className="pc-add-btn" onClick={add}>+ Adicionar etiqueta</button>
      )}
    </div>
  )
}

// ── Array genérico (cards, events, timeline) ──────────────────────────────────
function ArrayField({ field, value = [], onChange, token, slug }) {
  function addItem()         { if (value.length < (field.maxItems || 20)) onChange([...value, { ...field.defaultItem }]) }
  function removeItem(i)     { onChange(value.filter((_, idx) => idx !== i)) }
  function updateItem(i, v)  { const n = [...value]; n[i] = v; onChange(n) }
  function moveItem(i, dir)  {
    const j = i + dir
    if (j < 0 || j >= value.length) return
    const n = [...value];
    [n[i], n[j]] = [n[j], n[i]]
    onChange(n)
  }

  return (
    <div className="pc-field">
      <label className="pc-label">{field.label}</label>
      {field.hint && <InfoTip>{field.hint}</InfoTip>}

      {value.map((item, i) => (
        <div key={i} className="pc-array-item">
          <div className="pc-array-item-header">
            <span className="pc-item-num">#{i + 1}</span>
            <div className="pc-item-btns">
              <button type="button" className="pc-arr-btn" onClick={() => moveItem(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
              <button type="button" className="pc-arr-btn" onClick={() => moveItem(i, 1)} disabled={i === value.length - 1} aria-label="Descer">↓</button>
              <button type="button" className="pc-arr-btn rm" onClick={() => removeItem(i)} aria-label="Remover">✕</button>
            </div>
          </div>
          <div className="pc-array-item-fields">
            {field.itemSchema.map(subField => (
              <FieldRenderer
                key={subField.key}
                field={subField}
                value={item[subField.key]}
                onChange={v => updateItem(i, { ...item, [subField.key]: v })}
                token={token}
                slug={slug}
              />
            ))}
          </div>
        </div>
      ))}

      {value.length < (field.maxItems || 20) && (
        <button type="button" className="pc-add-btn" onClick={addItem}>
          + Adicionar {field.label.toLowerCase().replace(/s$/, '')}
        </button>
      )}
      {(field.minItems && value.length < field.minItems) && (
        <p className="pc-warning">Mínimo de {field.minItems} {field.label.toLowerCase()}.</p>
      )}
    </div>
  )
}

// ── Conteúdo rico (desc_long) ─────────────────────────────────────────────────
function RichContentField({ field, value = [], onChange, token, slug }) {
  const [addingType, setAddingType] = useState(false)

  function addBlock(blockType) {
    const bt = field.blockTypes.find(b => b.type === blockType)
    if (!bt) return
    onChange([...value, { ...bt.defaultValue }])
    setAddingType(false)
  }

  function removeBlock(i) { onChange(value.filter((_, idx) => idx !== i)) }

  function updateBlock(i, key, v) {
    const n = [...value]
    n[i] = { ...n[i], [key]: v }
    onChange(n)
  }

  function moveBlock(i, dir) {
    const j = i + dir
    if (j < 0 || j >= value.length) return
    const n = [...value];
    [n[i], n[j]] = [n[j], n[i]]
    onChange(n)
  }

  const blockTypeLabels = {
    paragraph: 'Parágrafo',
    heading:   'Subtítulo',
    image:     'Imagem',
    quote:     'Citação',
  }

  return (
    <div className="pc-field">
      <label className="pc-label">{field.label}</label>
      {field.hint && <InfoTip>{field.hint}</InfoTip>}

      <div className="pc-rich-blocks">
        {value.map((block, i) => {
          const bt = field.blockTypes.find(b => b.type === block.type)
          if (!bt) return null
          return (
            <div key={i} className={`pc-block pc-block-${block.type}`}>
              <div className="pc-block-header">
                <span className="pc-block-type">{blockTypeLabels[block.type] || block.type}</span>
                <div className="pc-item-btns">
                  <button type="button" className="pc-arr-btn" onClick={() => moveBlock(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
                  <button type="button" className="pc-arr-btn" onClick={() => moveBlock(i, 1)} disabled={i === value.length - 1} aria-label="Descer">↓</button>
                  <button type="button" className="pc-arr-btn rm" onClick={() => removeBlock(i)} aria-label="Remover">✕</button>
                </div>
              </div>
              <div className="pc-block-fields">
                {bt.fields.map(subField => (
                  <FieldRenderer
                    key={subField.key}
                    field={subField}
                    value={block[subField.key]}
                    onChange={v => updateBlock(i, subField.key, v)}
                    token={token}
                    slug={slug}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {!addingType ? (
        <button type="button" className="pc-add-btn" onClick={() => setAddingType(true)}>
          + Adicionar bloco
        </button>
      ) : (
        <div className="pc-block-type-picker">
          <span className="pc-label">Escolha o tipo de bloco:</span>
          <div className="pc-block-type-btns">
            {field.blockTypes.map(bt => (
              <button key={bt.type} type="button" className="pc-block-type-btn" onClick={() => addBlock(bt.type)}>
                {blockTypeLabels[bt.type] || bt.type}
              </button>
            ))}
            <button type="button" className="pc-cancel-small" onClick={() => setAddingType(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Dispatcher de campo ───────────────────────────────────────────────────────
function FieldRenderer({ field, value, onChange, token, slug }) {
  switch (field.type) {
    case 'text':        return <TextField       field={field} value={value} onChange={onChange} />
    case 'textarea':    return <TextareaField   field={field} value={value} onChange={onChange} />
    case 'checkbox':    return <CheckboxField   field={field} value={value} onChange={onChange} />
    case 'pills':       return <PillsField      field={field} value={value} onChange={onChange} />
    case 'cards':
    case 'events':
    case 'timeline':    return <ArrayField      field={field} value={value} onChange={onChange} token={token} slug={slug} />
    case 'richcontent': return <RichContentField field={field} value={value} onChange={onChange} token={token} slug={slug} />
    case 'image':       return (
      <div className="pc-field">
        <ImagePickerField
          token={token} slug={slug}
          value={value || { url: null, alt_text: '' }}
          onChange={onChange}
          label={field.label}
          hint={field.hint}
          compact
        />
      </div>
    )
    default: return null
  }
}

// ── Editor de uma seção ───────────────────────────────────────────────────────
function SectionEditor({ section, isFirst, isLast, onUpdate, onDelete, onToggle, onMoveUp, onMoveDown }) {
  const [expanded, setExpanded] = useState(false)
  const schema = SCHEMA_BY_TYPE[section.section_type]

  if (!schema) return null

  function updateField(key, val) {
    onUpdate({ ...section, content: { ...section.content, [key]: val } })
  }

  return (
    <div className={`pc-sec ${section.is_active ? '' : 'inactive'} ${section._new ? 'is-new' : ''}`}>
      <div className="pc-sec-header" onClick={() => setExpanded(e => !e)} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setExpanded(x => !x)}>
        <span className="pc-sec-toggle">{expanded ? '▾' : '▸'}</span>
        <span className="pc-sec-label">{schema.label}</span>
        {!section.is_active && <span className="pc-inactive-badge">Inativa</span>}
        {section._new && <span className="pc-new-badge">Nova</span>}

        <div className="pc-sec-controls" onClick={e => e.stopPropagation()}>
          <button type="button" className="pc-ctrl-btn" onClick={onMoveUp}  disabled={isFirst}  title="Mover para cima"  aria-label="Mover seção para cima">↑</button>
          <button type="button" className="pc-ctrl-btn" onClick={onMoveDown} disabled={isLast}  title="Mover para baixo" aria-label="Mover seção para baixo">↓</button>
          <button type="button" className={`pc-ctrl-btn toggle ${section.is_active ? '' : 'off'}`}
            onClick={onToggle} title={section.is_active ? 'Desativar seção' : 'Ativar seção'}
            aria-label={section.is_active ? 'Desativar' : 'Ativar'}>
            {section.is_active ? '◉' : '◎'}
          </button>
          <button type="button" className="pc-ctrl-btn del" onClick={onDelete} title="Remover seção" aria-label="Remover seção">✕</button>
        </div>
      </div>

      {expanded && (
        <div className="pc-sec-body">
          <p className="pc-sec-desc">{schema.description}</p>
          {schema.fields.map(field => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={section.content[field.key]}
              onChange={val => updateField(field.key, val)}
              token={section._token}
              slug={section._slug}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Coluna esquerda: biblioteca de tipos ──────────────────────────────────────
function SectionLibrary({ onAdd, count }) {
  return (
    <div className="pc-library">
      <div className="pc-library-header">
        <h3 className="pc-col-title">Seções disponíveis</h3>
        <p className="pc-col-sub">Clique para adicionar ao final da página.</p>
      </div>
      <div className="pc-lib-limit">
        <div className="pc-lib-limit-bar">
          <div className="pc-lib-limit-fill" style={{ width: `${Math.min((count / SECTIONS_LIMIT) * 100, 100)}%` }} />
        </div>
        <span>{count}/{SECTIONS_LIMIT} seções</span>
      </div>
      <div className="pc-lib-list">
        {SECTION_SCHEMAS.map(schema => (
          <button
            key={schema.type}
            type="button"
            className="pc-lib-item"
            onClick={() => onAdd(schema.type)}
            disabled={count >= SECTIONS_LIMIT}
            title={schema.description}
          >
            <span className="pc-lib-label">{schema.label}</span>
            <span className="pc-lib-desc">{schema.description}</span>
            <span className="pc-lib-add">+</span>
          </button>
        ))}
      </div>
      {count >= SECTIONS_LIMIT && (
        <p className="pc-lib-limit-msg">Limite de {SECTIONS_LIMIT} seções atingido.</p>
      )}
    </div>
  )
}

// ── Coluna direita: estilo, paleta e salvar ───────────────────────────────────
function StylePanel({ style, palette, onStyleChange, onPaletteChange, onSave, saving, isDirty }) {
  const palettes = getPalettesForStyle(style)

  return (
    <div className="pc-style-panel">
      <div className="pc-style-section">
        <h3 className="pc-col-title">Estilo da página</h3>
        <p className="pc-col-sub">
          O estilo muda a aparência visual — tipografia, formas e sombras. O conteúdo das seções não é afetado.
        </p>
        <div className="pc-style-list">
          {Object.values(STYLES).map(s => (
            <button
              key={s.id}
              type="button"
              className={`pc-style-card ${style === s.id ? 'active' : ''}`}
              onClick={() => onStyleChange(s.id)}
            >
              <div className="pc-style-swatch" style={{ background: s.previewBg, borderColor: s.previewColor }}>
                <div className="pc-swatch-dot" style={{ background: s.previewColor }} />
              </div>
              <div>
                <span className="pc-style-name">{s.label}</span>
                <span className="pc-style-desc">{s.description}</span>
              </div>
              {style === s.id && <span className="pc-style-check">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="pc-style-section">
        <h3 className="pc-col-title">Paleta de cores</h3>
        <p className="pc-col-sub">
          Cada paleta aplica um conjunto harmônico de cores ao estilo escolhido. Experimente e veja qual representa melhor sua comunidade.
        </p>
        <div className="pc-palette-list">
          {palettes.map(p => (
            <button
              key={p.id}
              type="button"
              className={`pc-palette-btn ${palette === p.id ? 'active' : ''}`}
              onClick={() => onPaletteChange(p.id)}
              title={p.label}
              aria-label={p.label}
              aria-pressed={palette === p.id}
            >
              <div className="pc-palette-swatch" style={{ background: p.color }} />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pc-save-wrap">
        {isDirty && <p className="pc-dirty-hint">Há alterações não salvas.</p>}
        <button
          type="button"
          className="pc-save-btn"
          onClick={onSave}
          disabled={saving || !isDirty}
        >
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
        {!isDirty && !saving && (
          <p className="pc-nodirty">Nenhuma alteração pendente.</p>
        )}
      </div>
    </div>
  )
}

// ── PageConfig (componente principal) ─────────────────────────────────────────
export default function PageConfig({ token, slug }) {
  const [sections,  setSections]  = useState([])
  const [origSecs,  setOrigSecs]  = useState([])   // snapshot para diff no save
  const [style,     setStyle]     = useState('uniao')
  const [palette,   setPalette]   = useState('verde')
  const [origStyle, setOrigStyle] = useState('uniao')
  const [origPal,   setOrigPal]   = useState('verde')
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState('')

  const loadPage = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/admin/page`, { headers: authHeaders(token) })
      const secs = data.sections.map(s => ({
        ...s,
        content: typeof s.content === 'string' ? JSON.parse(s.content) : s.content,
        _token: token,
        _slug:  slug,
      }))
      setSections(secs)
      setOrigSecs(JSON.parse(JSON.stringify(secs)))
      setStyle(data.style);   setOrigStyle(data.style)
      setPalette(data.palette); setOrigPal(data.palette)
    } finally {
      setLoading(false)
    }
  }, [slug, token])

  useEffect(() => { loadPage() }, [loadPage])

  // ── Operações na lista de seções ────────────────────────────────────────────
  function addSection(sectionType) {
    if (sections.length >= SECTIONS_LIMIT) return
    const newSec = {
      id: tmpId(),
      section_type: sectionType,
      order_index:  sections.length,
      is_active:    true,
      content:      getDefaultContent(sectionType),
      _new:   true,
      _token: token,
      _slug:  slug,
    }
    setSections(prev => [...prev, newSec])
  }

  function updateSection(updated) {
    setSections(prev => prev.map(s => s.id === updated.id ? updated : s))
  }

  function toggleSection(id) {
    setSections(prev => prev.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s))
  }

  function deleteSection(id) {
    setSections(prev => prev.filter(s => s.id !== id))
  }

  function moveSection(id, dir) {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === id)
      const j   = idx + dir
      if (j < 0 || j >= prev.length) return prev
      const n = [...prev];
      [n[idx], n[j]] = [n[j], n[idx]]
      return n
    })
  }

  // ── Salvar ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true); setSaveMsg('')
    try {
      const origIds    = new Set(origSecs.map(s => s.id))
      const currentIds = new Set(sections.filter(s => !s._new).map(s => s.id))

      // 1. Deletar seções removidas
      for (const id of origIds) {
        if (!currentIds.has(id)) {
          await apiFetch(`/api/admin/sections/${id}`, {
            method: 'DELETE', headers: authHeaders(token),
          })
        }
      }

      // 2. Criar seções novas e coletar mapa _new_id → real_id
      const idMap = {}
      for (const s of sections.filter(s => s._new)) {
        const res = await apiFetch(`/api/admin/sections`, {
          method: 'POST',
          headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
          body: JSON.stringify({ section_type: s.section_type, content: s.content }),
        })
        idMap[s.id] = res.id
      }

      // 3. Atualizar conteúdo de seções existentes que mudaram
      for (const s of sections.filter(s => !s._new)) {
        const orig = origSecs.find(o => o.id === s.id)
        if (orig && !deepEqual(orig.content, s.content)) {
          await apiFetch(`/api/admin/sections/${s.id}`, {
            method: 'PUT',
            headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: s.content }),
          })
        }
        // Toggle se estado mudou
        if (orig && orig.is_active !== s.is_active) {
          await apiFetch(`/api/admin/sections/${s.id}/toggle`, {
            method: 'PATCH', headers: authHeaders(token),
          })
        }
      }

      // 4. Reordenar (todos os IDs reais, na ordem atual)
      const orderedIds = sections
        .map(s => s._new ? idMap[s.id] : s.id)
        .filter(Boolean)
      if (orderedIds.length > 0) {
        await apiFetch(`/api/admin/sections/reorder/batch`, {
          method: 'PUT',
          headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: orderedIds }),
        })
      }

      // 5. Estilo / paleta
      if (style !== origStyle || palette !== origPal) {
        await apiFetch(`/api/admin/page/style`, {
          method: 'PUT',
          headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
          body: JSON.stringify({ style, palette }),
        })
      }

      await loadPage()
      setSaveMsg('ok')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      setSaveMsg('error:' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── isDirty ─────────────────────────────────────────────────────────────────
  const isDirty = (
    style !== origStyle ||
    palette !== origPal ||
    sections.some(s => s._new) ||
    sections.length !== origSecs.length ||
    sections.some((s, i) => {
      if (s._new) return false
      const orig = origSecs.find(o => o.id === s.id)
      return !orig ||
        !deepEqual(orig.content, s.content) ||
        orig.is_active !== s.is_active ||
        origSecs.indexOf(orig) !== i
    })
  )

  if (loading) return (
    <div className="pc-loading"><div className="pc-spinner" /></div>
  )

  return (
    <div className="page-config">

      {/* ── Coluna esquerda: biblioteca ── */}
      <SectionLibrary onAdd={addSection} count={sections.length} />

      {/* ── Coluna central: editor ── */}
      <div className="pc-center">
        <div className="pc-center-header">
          <h2 className="pc-col-title">Página institucional</h2>
          <p className="pc-col-sub">
            Organize as seções da sua página. Clique em uma seção para editar o conteúdo.
            Use as setas para reordenar, o botão ◉ para ativar/desativar e ✕ para remover.
          </p>
        </div>

        {saveMsg === 'ok' && (
          <div className="pc-save-ok">✓ Alterações salvas com sucesso.</div>
        )}
        {saveMsg.startsWith('error:') && (
          <div className="pc-save-err">Erro ao salvar: {saveMsg.slice(6)}</div>
        )}

        {sections.length === 0 ? (
          <div className="pc-empty">
            <p>Nenhuma seção adicionada.</p>
            <p className="pc-empty-hint">Use a coluna à esquerda para adicionar seções à página.</p>
          </div>
        ) : (
          <div className="pc-sections-list">
            {sections.map((sec, i) => (
              <SectionEditor
                key={sec.id}
                section={sec}
                isFirst={i === 0}
                isLast={i === sections.length - 1}
                onUpdate={updateSection}
                onDelete={() => deleteSection(sec.id)}
                onToggle={() => toggleSection(sec.id)}
                onMoveUp={() => moveSection(sec.id, -1)}
                onMoveDown={() => moveSection(sec.id, 1)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Coluna direita: estilo + salvar ── */}
      <StylePanel
        style={style}
        palette={palette}
        onStyleChange={s => { setStyle(s); const pals = getPalettesForStyle(s); if (!pals.find(p => p.id === palette)) setPalette(pals[0]?.id || 'verde') }}
        onPaletteChange={setPalette}
        onSave={handleSave}
        saving={saving}
        isDirty={isDirty}
      />

    </div>
  )
}
