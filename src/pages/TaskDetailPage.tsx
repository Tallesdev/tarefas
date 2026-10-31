import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { useStore } from '../data/store'
import { repeatLabels, repeatToRule, ruleToRepeat } from '../lib/dates'
import type { Repeat } from '../lib/types'

const REMINDERS: { value: number | null; label: string }[] = [
  { value: null, label: 'Sem lembrete' },
  { value: 0, label: 'Na hora' },
  { value: 5, label: '5 min antes' },
  { value: 15, label: '15 min antes' },
  { value: 30, label: '30 min antes' },
  { value: 60, label: '1 hora antes' },
  { value: 1440, label: '1 dia antes' },
]

export default function TaskDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { ready, tasks, categories, updateTask, addTask, toggleTask, deleteTask } = useStore()
  const task = tasks.find((t) => t.id === id)
  const subtasks = tasks.filter((t) => t.parent_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at))

  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [newSub, setNewSub] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setNotes(task.notes ?? '')
    }
    // só ao trocar de tarefa, para não sobrescrever o que está sendo digitado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id])

  if (!ready) return <div className="page"><div className="loading">Carregando…</div></div>
  if (!task)
    return (
      <div className="page detail">
        <header className="top">
          <button className="icon-btn" aria-label="Voltar" onClick={() => navigate(-1)}>
            <Icon name="back" />
          </button>
        </header>
        <p className="loading">Esta tarefa não existe mais.</p>
      </div>
    )

  const saveTitle = () => {
    const t = title.trim()
    if (t && t !== task.title) updateTask(task.id, { title: t })
    else setTitle(task.title)
  }
  const saveNotes = () => {
    const n = notes.trim() || null
    if (n !== task.notes) updateTask(task.id, { notes: n })
  }
  const addSub = async () => {
    if (!newSub.trim()) return
    await addTask({ title: newSub, parent_id: task.id, category_id: task.category_id })
    setNewSub('')
  }

  return (
    <div className="page detail">
      <header className="top">
        <button className="icon-btn" aria-label="Voltar" onClick={() => navigate(-1)}>
          <Icon name="back" />
        </button>
        <label className="pill-select">
          <Icon name="tag" size={16} />
          <select
            value={task.category_id ?? ''}
            onChange={(e) => updateTask(task.id, { category_id: e.target.value || null })}
            aria-label="Categoria"
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <span className="spacer" />
        <button
          className={`btn-text ${task.is_done ? '' : 'primary'}`}
          onClick={() => toggleTask(task.id)}
        >
          {task.is_done ? 'Reabrir' : 'Concluir'}
        </button>
      </header>

      <main className="content">
        <textarea
          className={`detail-title ${task.is_done ? 'is-done' : ''}`}
          value={title}
          rows={1}
          maxLength={500}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          aria-label="Título da tarefa"
        />

        <ul className="subtasks">
          {subtasks.map((s) => (
            <li key={s.id} className={s.is_done ? 'is-done' : ''}>
              <button className="check small" aria-pressed={s.is_done} aria-label="Concluir subtarefa" onClick={() => toggleTask(s.id)}>
                <Icon name="check" size={12} />
              </button>
              <span>{s.title}</span>
              <button className="icon-btn small" aria-label="Excluir subtarefa" onClick={() => deleteTask(s.id)}>
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
          <li className="sub-add">
            <Icon name="plus" size={18} />
            <input
              placeholder="Adicionar subtarefa"
              value={newSub}
              maxLength={500}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSub()}
              onBlur={addSub}
              enterKeyHint="done"
            />
          </li>
        </ul>

        <div className="rows">
          <label className="row">
            <Icon name="calendar" />
            <span>Data de vencimento</span>
            <input
              type="date"
              value={task.due_date ?? ''}
              onChange={(e) => updateTask(task.id, { due_date: e.target.value || null })}
            />
          </label>
          <label className="row">
            <Icon name="clock" />
            <span>Hora</span>
            <input
              type="time"
              value={task.due_time?.slice(0, 5) ?? ''}
              onChange={(e) => updateTask(task.id, { due_time: e.target.value ? `${e.target.value}:00` : null })}
            />
          </label>
          <label className="row">
            <Icon name="bell" />
            <span>Lembrete</span>
            <select
              value={task.reminder_minutes ?? ''}
              onChange={(e) => updateTask(task.id, { reminder_minutes: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={!task.due_date}
            >
              {REMINDERS.map((r) => (
                <option key={r.label} value={r.value ?? ''}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="row">
            <Icon name="repeat" />
            <span>Repetir</span>
            <select
              value={ruleToRepeat(task.recurrence_rule)}
              onChange={(e) => updateTask(task.id, { recurrence_rule: repeatToRule(e.target.value as Repeat) })}
              disabled={!task.due_date}
            >
              {(Object.keys(repeatLabels) as Repeat[]).map((r) => (
                <option key={r} value={r}>
                  {repeatLabels[r]}
                </option>
              ))}
            </select>
          </label>
          {!task.due_date && <p className="row-hint">Defina uma data para usar lembrete e repetição.</p>}
        </div>

        <label className="notes">
          <span>
            <Icon name="note" size={18} /> Notas
          </span>
          <textarea
            value={notes}
            rows={4}
            placeholder="Detalhes, links, endereço…"
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
          />
        </label>

        {!task.is_done && (
          <button className="btn-secondary" onClick={() => navigate(`/foco?tarefa=${task.id}`)}>
            <Icon name="timer" size={18} /> Focar nesta tarefa
          </button>
        )}

        <button
          className="btn-delete"
          onClick={async () => {
            if (!confirmDelete) return setConfirmDelete(true)
            await deleteTask(task.id)
            navigate(-1)
          }}
        >
          <Icon name="trash" size={18} />
          {confirmDelete ? 'Toque de novo para excluir' : 'Excluir tarefa'}
        </button>
      </main>
    </div>
  )
}
