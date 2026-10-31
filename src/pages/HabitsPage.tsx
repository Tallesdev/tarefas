import { format, isToday, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import { useHabits } from '../data/habits'
import { capitalize, toISODate } from '../lib/dates'
import { isScheduled, streak } from '../lib/habits'

export default function HabitsPage() {
  const navigate = useNavigate()
  const { habits, doneSet, toggleLog } = useHabits()
  const [day, setDay] = useState(() => new Date())
  const dayISO = toISODate(day)
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i)), [])

  const active = habits.filter((h) => !h.archived)
  const scheduled = active.filter((h) => isScheduled(h, day))
  const others = active.filter((h) => !isScheduled(h, day))
  const doneCount = scheduled.filter((h) => doneSet(h.id).has(dayISO)).length

  const dayLabel = isToday(day) ? 'hoje' : capitalize(format(day, "EEEE", { locale: ptBR })).toLowerCase()

  return (
    <div className="page">
      <PageHeader
        title="Hábitos"
        subtitle={scheduled.length ? `${doneCount} de ${scheduled.length} feitos ${dayLabel}` : 'Pequenas rotinas, todo dia'}
        right={
          <button className="icon-btn" aria-label="Novo hábito" onClick={() => navigate('/habito/novo')}>
            <Icon name="plus" />
          </button>
        }
      >
        <div className="week-strip" role="tablist" aria-label="Dia">
          {week.map((d) => {
            const iso = toISODate(d)
            const due = active.filter((h) => isScheduled(h, d))
            const done = due.filter((h) => doneSet(h.id).has(iso)).length
            const full = due.length > 0 && done === due.length
            return (
              <button
                key={iso}
                role="tab"
                aria-selected={iso === dayISO}
                className={`week-day ${iso === dayISO ? 'on' : ''} ${full ? 'full' : ''}`}
                onClick={() => setDay(d)}
              >
                <span>{format(d, 'EEEEEE', { locale: ptBR })}</span>
                <strong>{format(d, 'd')}</strong>
                <i style={{ ['--p' as string]: due.length ? done / due.length : 0 }} />
              </button>
            )
          })}
        </div>
      </PageHeader>

      <main className="content">
        {active.length === 0 ? (
          <>
            <EmptyState title="Nenhum hábito ainda" hint="Comece com algo pequeno, como beber água ou ler 10 páginas." />
            <button className="btn-primary block" onClick={() => navigate('/habito/novo')}>
              Escolher hábitos
            </button>
          </>
        ) : (
          <>
            {scheduled.length > 0 && (
              <ul className="list">
                {scheduled.map((h) => {
                  const done = doneSet(h.id)
                  const isDone = done.has(dayISO)
                  const s = streak(h, done)
                  return (
                    <li key={h.id} className={`habit ${isDone ? 'is-done' : ''}`}>
                      <button className="habit-body" onClick={() => navigate(`/habito/${h.id}`)}>
                        <span className="habit-icon" aria-hidden="true">
                          {h.icon || '•'}
                        </span>
                        <span className="habit-text">
                          <span className="habit-name">{h.name}</span>
                          <span className="habit-meta">
                            {h.kind === 'quit' ? 'Largar' : 'Criar'}
                            {s > 0 && (
                              <span className="streak">
                                <Icon name="flame" size={13} /> {s} {s === 1 ? 'dia' : 'dias'}
                              </span>
                            )}
                            {h.reminder_time && <span>· {h.reminder_time.slice(0, 5)}</span>}
                          </span>
                        </span>
                      </button>
                      <button
                        className="habit-check"
                        aria-pressed={isDone}
                        aria-label={isDone ? `Desmarcar ${h.name}` : `Marcar ${h.name}`}
                        onClick={() => toggleLog(h.id, dayISO)}
                      >
                        <Icon name="check" size={18} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {scheduled.length === 0 && <p className="muted-note">Nenhum hábito programado para este dia.</p>}
            {others.length > 0 && (
              <section className="group">
                <div className="group-head static">
                  <span>Outros dias</span>
                  <span className="group-count">{others.length}</span>
                </div>
                <ul className="list">
                  {others.map((h) => (
                    <li key={h.id} className="habit off">
                      <button className="habit-body" onClick={() => navigate(`/habito/${h.id}`)}>
                        <span className="habit-icon" aria-hidden="true">
                          {h.icon || '•'}
                        </span>
                        <span className="habit-text">
                          <span className="habit-name">{h.name}</span>
                          <span className="habit-meta">Não programado para este dia</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
