import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { useSettings } from '../data/settings'
import { DEFAULT_PACKS, PACKS, visibleSuggestions, type PackId } from '../lib/suggestions'

export default function SuggestionsPage() {
  const navigate = useNavigate()
  const { settings, updateSettings } = useSettings()
  const [draft, setDraft] = useState('')
  const packs = settings.packs ?? DEFAULT_PACKS
  const custom = settings.customSuggestions ?? []
  const hidden = settings.hiddenSuggestions ?? []
  const list = visibleSuggestions(settings)

  const togglePack = (id: PackId) =>
    updateSettings({ packs: packs.includes(id) ? packs.filter((p) => p !== id) : [...packs, id] })

  const add = () => {
    const v = draft.trim()
    if (!v) return
    updateSettings({
      customSuggestions: [v, ...custom.filter((c) => c !== v)],
      hiddenSuggestions: hidden.filter((h) => h !== v),
    })
    setDraft('')
  }

  const remove = (item: string) =>
    custom.includes(item)
      ? updateSettings({ customSuggestions: custom.filter((c) => c !== item) })
      : updateSettings({ hiddenSuggestions: [...hidden, item] })

  return (
    <div className="page detail">
      <header className="top">
        <button className="icon-btn" aria-label="Voltar" onClick={() => navigate(-1)}>
          <Icon name="back" />
        </button>
        <h1 className="page-title">Sugestões</h1>
      </header>

      <main className="content">
        <section className="panel">
          <h2>Seu perfil</h2>
          <p className="panel-sub">As sugestões mudam conforme o que você faz. Escolha quantos quiser.</p>
          <div className="pack-list">
            {PACKS.map((p) => (
              <button
                key={p.id}
                className={`chip ${packs.includes(p.id) ? 'on' : ''}`}
                aria-pressed={packs.includes(p.id)}
                onClick={() => togglePack(p.id)}
              >
                {packs.includes(p.id) && <Icon name="check" size={14} />} {p.name}
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Aparecem ao criar tarefa</h2>
          <form
            className="sug-add"
            onSubmit={(e) => {
              e.preventDefault()
              add()
            }}
          >
            <input
              className="field"
              placeholder="Nova sugestão, ex.: Reunião sexta às 10h"
              value={draft}
              maxLength={80}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="send-btn" disabled={!draft.trim()} aria-label="Adicionar sugestão">
              <Icon name="plus" />
            </button>
          </form>
          {list.length === 0 ? (
            <p className="panel-sub">Nenhuma sugestão. Escolha um perfil ou crie as suas.</p>
          ) : (
            <ul className="sug-list">
              {list.map((item) => (
                <li key={item}>
                  <span>{item}</span>
                  {custom.includes(item) && <span className="sug-tag">sua</span>}
                  <button className="icon-btn small" aria-label={`Remover ${item}`} onClick={() => remove(item)}>
                    <Icon name="close" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hidden.length > 0 && (
            <button className="btn-text primary restore" onClick={() => updateSettings({ hiddenSuggestions: [] })}>
              Mostrar de novo as {hidden.length} removidas
            </button>
          )}
        </section>
      </main>
    </div>
  )
}
