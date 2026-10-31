import { format, subDays } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import { useHabits } from '../data/habits'
import { ALL_DAYS, bestStreak, isScheduled, rate30, streak, TEMPLATES, WEEKDAY_SHORT, type Habit } from '../lib/habits'

type Form = { name: string; icon: string; kind: 'build' | 'quit'; week_days: number[]; reminder_time: string }

const empty: Form = { name: '', icon: '✨', kind: 'build', week_days: ALL_DAYS, reminder_time: '' }
const fromHabit = (h: Habit): Form => ({
  name: h.name,
  icon: h.icon ?? '✨',
  kind: h.kind,
  week_days: h.week_days,
  reminder_time: h.reminder_time?.slice(0, 5) ?? '',
})

export default function HabitEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { habits, doneSet, addHabit, updateHabit, deleteHabit, toggleLog } = useHabits()
  const habit = habits.find((h) => h.id === id)
  const isNew = !id
  const [form, setForm] = useState<Form>(habit ? fromHabit(habit) : empty)
  const [step, setStep] = useState<'pick' | 'form'>(isNew ? 'pick' : 'form')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))
  // abriu pelo link antes dos hábitos carregarem: preenche quando chegarem
  const filled = useRef(Boolean(habit))
  useEffect(() => {
    if (habit && !filled.current) {
      filled.current = true
      setForm(fromHabit(habit))
    }
  }, [habit])

  const done = habit ? doneSet(habit.id) : new Set<string>()
  const last35 = useMemo(() => Array.from({ length: 35 }, (_, i) => subDays(new Date(), 34 - i)), [])
  const existingNames = new Set(habits.map((h) => h.name.toLowerCase()))

  if (!isNew && !habit) {
    return (
      <div className="page detail">
        <PageHeader title="Hábito" left={<BackButton />} />
        <p className="loading">Carregando…</p>
      </div>
    )
  }

  const valid = form.name.trim().length > 0 && form.week_days.length > 0
  const save = async () => {
    if (!valid) return
    const payload = {
      name: form.name.trim(),
      icon: form.icon.trim() || null,
      kind: form.kind,
      week_days: [...form.week_days].sort(),
      reminder_time: form.reminder_time ? `${form.reminder_time}:00` : null,
    }
    if (habit) await updateHabit(habit.id, payload)
    else await addHabit(payload)
    navigate('/habitos', { replace: true })
  }

  if (step === 'pick') {
    return (
      <div className="page detail">
        <PageHeader title="Novo hábito" subtitle="Escolha um modelo ou crie do seu jeito" left={<BackButton />} />
        <main className="content">
          <button className="list-action" onClick={() => setStep('form')}>
            <span className="habit-icon">✨</span>
            <span>Criar hábito personalizado</span>
            <Icon name="chevronRight" size={18} />
          </button>
          {TEMPLATES.map((g) => (
            <section key={g.group} className="group">
              <div className="group-head static">
                <span>{g.group}</span>
              </div>
              <ul className="list">
                {g.items.map(([icon, name]) => {
                  const added = existingNames.has(name.toLowerCase())
                  return (
                    <li key={name}>
                      <button
                        className="tpl-row"
                        disabled={added}
                        onClick={() => {
                          setForm({ ...empty, icon, name, kind: g.kind })
                          setStep('form')
                        }}
                      >
                        <span className="habit-icon">{icon}</span>
                        <span className="tpl-name">{name}</span>
                        {added ? <span className="tag">Adicionado</span> : <Icon name="plus" size={18} />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </main>
      </div>
    )
  }

  return (
    <div className="page detail">
      <PageHeader
        title={habit ? habit.name : 'Novo hábito'}
        left={<BackButton onClick={isNew ? () => setStep('pick') : undefined} />}
        right={
          <button className="btn-text primary" disabled={!valid} onClick={save}>
            Salvar
          </button>
        }
      />
      <main className="content">
        {habit && (
          <>
            <div className="stats-row">
              <div className="stat">
                <strong>{streak(habit, done)}</strong>
                <span>Sequência</span>
              </div>
              <div className="stat">
                <strong>{bestStreak(habit, done)}</strong>
                <span>Recorde</span>
              </div>
              <div className="stat">
                <strong>{rate30(habit, done)}%</strong>
                <span>Últimos 30 dias</span>
              </div>
            </div>
            <section className="panel">
              <h2>Últimas 5 semanas</h2>
              <p className="panel-sub">Toque num dia para marcar ou desmarcar.</p>
              <div className="habit-grid">
                {last35.map((d) => {
                  const iso = format(d, 'yyyy-MM-dd')
                  const on = done.has(iso)
                  const sched = isScheduled(habit, d)
                  return (
                    <button
                      key={iso}
                      className={`hg-cell ${on ? 'on' : ''} ${sched ? '' : 'off'}`}
                      aria-label={`${format(d, 'dd/MM')}: ${on ? 'feito' : 'não feito'}`}
                      onClick={() => toggleLog(habit.id, iso)}
                    >
                      {format(d, 'd')}
                    </button>
                  )
                })}
              </div>
            </section>
          </>
        )}

        <section className="panel form">
          <div className="name-row">
            <input
              className="emoji-input"
              value={form.icon}
              maxLength={4}
              onChange={(e) => set({ icon: e.target.value })}
              aria-label="Ícone (emoji)"
            />
            <input
              className="field"
              placeholder="Nome do hábito"
              value={form.name}
              maxLength={100}
              onChange={(e) => set({ name: e.target.value })}
              autoFocus={isNew}
            />
          </div>

          <div className="field-label">Tipo</div>
          <div className="segmented">
            <button className={form.kind === 'build' ? 'on' : ''} onClick={() => set({ kind: 'build' })}>
              Criar hábito
            </button>
            <button className={form.kind === 'quit' ? 'on' : ''} onClick={() => set({ kind: 'quit' })}>
              Largar hábito
            </button>
          </div>
          <p className="field-hint left">
            {form.kind === 'build' ? 'Marque quando fizer.' : 'Marque nos dias em que conseguiu evitar.'}
          </p>

          <div className="field-label">Dias</div>
          <div className="days">
            {ALL_DAYS.map((d) => (
              <button
                key={d}
                className={form.week_days.includes(d) ? 'on' : ''}
                aria-pressed={form.week_days.includes(d)}
                onClick={() =>
                  set({ week_days: form.week_days.includes(d) ? form.week_days.filter((x) => x !== d) : [...form.week_days, d] })
                }
              >
                {WEEKDAY_SHORT[d - 1]}
              </button>
            ))}
          </div>

          <label className="row plain">
            <Icon name="bell" />
            <span>Lembrete</span>
            <input type="time" value={form.reminder_time} onChange={(e) => set({ reminder_time: e.target.value })} />
          </label>
          {form.reminder_time && (
            <button className="btn-text left" onClick={() => set({ reminder_time: '' })}>
              Remover lembrete
            </button>
          )}
        </section>

        {habit && (
          <button
            className="btn-delete"
            onClick={async () => {
              if (!confirmDelete) return setConfirmDelete(true)
              await deleteHabit(habit.id)
              navigate('/habitos', { replace: true })
            }}
          >
            <Icon name="trash" size={18} />
            {confirmDelete ? 'Toque de novo para excluir' : 'Excluir hábito'}
          </button>
        )}
      </main>
    </div>
  )
}

function BackButton({ onClick }: { onClick?: () => void }) {
  const navigate = useNavigate()
  return (
    <button className="icon-btn" aria-label="Voltar" onClick={onClick ?? (() => navigate(-1))}>
      <Icon name="back" />
    </button>
  )
}
