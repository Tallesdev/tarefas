import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../data/settings'
import { groupedSuggestions, visibleSuggestions } from '../lib/suggestions'
import { smartSuggestions } from '../lib/smart'
import { dueLabel, parseSmart } from '../lib/dates'
import { useStore } from '../data/store'
import { useKeyboardInset } from '../lib/useKeyboardInset'
import Icon from './Icon'

type Props = {
  open: boolean
  onClose: () => void
  defaultCategoryId?: string | null
  defaultDate?: string | null
}

// Reconhecimento de voz do navegador (Chrome/Android e Safari recente)
type SpeechCtor = new () => {
  lang: string
  interimResults: boolean
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void
  onend: () => void
  start: () => void
  stop: () => void
}
const getSpeech = (): SpeechCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export default function QuickAdd({ open, onClose, defaultCategoryId = null, defaultDate = null }: Props) {
  const { categories, tasks, addTask } = useStore()
  const [text, setText] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(defaultCategoryId)
  const [pickedDate, setPickedDate] = useState<string | null>(null) // escolhida no seletor: vence tudo
  const [showTemplates, setShowTemplates] = useState(false)
  const [listening, setListening] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const Speech = getSpeech()
  const keyboard = useKeyboardInset(open)
  const { settings } = useSettings()
  const smart = useMemo(() => (open ? smartSuggestions(tasks, settings.packs) : []), [open, tasks, settings.packs])
  const suggestions = useMemo(() => {
    const smartTexts = new Set(smart.map((x) => x.text))
    return visibleSuggestions(settings).filter((x) => !smartTexts.has(x))
  }, [settings, smart])
  const groups = useMemo(() => groupedSuggestions(settings), [settings])
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setText('')
      setCategoryId(defaultCategoryId)
      setPickedDate(null)
      setShowTemplates(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, defaultCategoryId, defaultDate])

  const parsed = useMemo(() => parseSmart(text), [text])
  // data: escolhida no seletor > escrita no texto ("amanhã") > dia tocado no calendário
  const due_date = pickedDate ?? parsed.due_date ?? defaultDate
  const label = dueLabel({ due_date, due_time: parsed.due_time })

  async function submit() {
    const title = parsed.title.trim() || text.trim()
    if (!title) return
    await addTask({ title, category_id: categoryId, due_date, due_time: parsed.due_time })
    setText('')
    setPickedDate(null)
    inputRef.current?.focus()
  }

  const applySuggestion = (value: string) => {
    setText(value)
    setShowTemplates(false)
    inputRef.current?.focus()
  }

  function listen() {
    if (!Speech) return
    const rec = new Speech()
    rec.lang = 'pt-BR'
    rec.interimResults = false
    rec.onresult = (e) => setText((t) => `${t} ${e.results[0][0].transcript}`.trim())
    rec.onend = () => setListening(false)
    setListening(true)
    rec.start()
  }

  if (!open) return null

  return (
    <div className="sheet-backdrop" onClick={onClose} style={keyboard ? { paddingBottom: keyboard } : undefined}>
      <form
        className={`sheet quick-add ${keyboard ? 'kb-open' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {showTemplates && (
          <div className="templates" aria-label="Modelos de tarefa">
            {smart.length > 0 && (
              <section>
                <h3>
                  <Icon name="sparkle" size={15} /> Para você
                </h3>
                {smart.map((x) => (
                  <button type="button" key={x.text} className="tpl" onClick={() => applySuggestion(x.text)}>
                    <span>{x.text}</span>
                    <small>{x.reason}</small>
                  </button>
                ))}
              </section>
            )}
            {groups.map((g) => (
              <section key={g.title}>
                <h3>{g.title}</h3>
                {g.items.map((item) => (
                  <button type="button" key={item} className="tpl" onClick={() => applySuggestion(item)}>
                    <span>{item}</span>
                  </button>
                ))}
              </section>
            ))}
            <button
              type="button"
              className="btn-text primary tpl-edit"
              onClick={() => {
                onClose()
                navigate('/sugestoes')
              }}
            >
              <Icon name="pencil" size={14} /> Editar sugestões e perfil
            </button>
          </div>
        )}

        {!text && !showTemplates && (smart.length > 0 || suggestions.length > 0) && (
          <div className="suggestions" aria-label="Sugestões">
            {smart.map((x) => (
              <button
                type="button"
                key={x.text}
                className="sug smart"
                title={x.reason}
                onMouseDown={(e) => e.preventDefault() /* mantém o teclado aberto */}
                onClick={() => applySuggestion(x.text)}
              >
                <Icon name="sparkle" size={13} /> {x.text}
              </button>
            ))}
            {suggestions.map((sug) => (
              <button
                type="button"
                key={sug}
                className="sug"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applySuggestion(sug)}
              >
                {sug}
              </button>
            ))}
          </div>
        )}
        <div className="qa-row">
          <input
            ref={inputRef}
            className="qa-input"
            placeholder="Ex.: Dentista na próxima terça às 15h"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            enterKeyHint="send"
          />
          {Speech && (
            <button type="button" className={`icon-btn ${listening ? 'listening' : ''}`} onClick={listen} aria-label="Ditar tarefa">
              <Icon name="mic" />
            </button>
          )}
        </div>

        <div className="qa-tools">
          <label className="pill-select">
            <Icon name="tag" size={16} />
            <select value={categoryId ?? ''} onChange={(e) => setCategoryId(e.target.value || null)} aria-label="Categoria">
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className={`pill-select ${due_date ? 'has-value' : ''}`}>
            <Icon name="calendar" size={16} />
            <span>{label ?? 'Data'}</span>
            <input
              type="date"
              className="hidden-date"
              value={due_date ?? ''}
              onChange={(e) => setPickedDate(e.target.value || null)}
              aria-label="Data de vencimento"
            />
          </label>

          <button
            type="button"
            className={`icon-btn ${showTemplates ? 'on' : ''}`}
            aria-label="Modelos de tarefa"
            aria-pressed={showTemplates}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowTemplates((v) => !v)}
          >
            <Icon name="clipboard" />
          </button>
          <button type="submit" className="send-btn" disabled={!text.trim()} aria-label="Salvar tarefa">
            <Icon name="send" />
          </button>
        </div>
      </form>
    </div>
  )
}
