import { useEffect, useMemo, useRef, useState } from 'react'
import { dueLabel, parseSmart } from '../lib/dates'
import { useStore } from '../data/store'
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
  const { categories, addTask } = useStore()
  const [text, setText] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(defaultCategoryId)
  const [manualDate, setManualDate] = useState<string | null>(defaultDate)
  const [listening, setListening] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const Speech = getSpeech()

  useEffect(() => {
    if (open) {
      setText('')
      setCategoryId(defaultCategoryId)
      setManualDate(defaultDate)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, defaultCategoryId, defaultDate])

  const parsed = useMemo(() => parseSmart(text), [text])
  const due_date = manualDate ?? parsed.due_date
  const label = dueLabel({ due_date, due_time: parsed.due_time })

  async function submit() {
    const title = (manualDate ? text : parsed.title).trim() || text.trim()
    if (!title) return
    await addTask({ title, category_id: categoryId, due_date, due_time: parsed.due_time })
    setText('')
    setManualDate(defaultDate)
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
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet quick-add"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
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
              onChange={(e) => setManualDate(e.target.value || null)}
              aria-label="Data de vencimento"
            />
          </label>

          <button type="submit" className="send-btn" disabled={!text.trim()} aria-label="Salvar tarefa">
            <Icon name="send" />
          </button>
        </div>
      </form>
    </div>
  )
}
