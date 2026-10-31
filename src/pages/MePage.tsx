import { addDays, format, parseISO, startOfWeek, subDays, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import TaskItem from '../components/TaskItem'
import { useAuth } from '../data/auth'
import { useFocus } from '../data/focus'
import { useHabits } from '../data/habits'
import { useStore } from '../data/store'
import { toISODate, todayISO } from '../lib/dates'
import { isScheduled } from '../lib/habits'

const WEEKS = 18

export default function MePage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { tasks, categories } = useStore()
  const { sessions } = useFocus()
  const { habits, logs, doneSet } = useHabits()
  const main = tasks.filter((t) => !t.parent_id)
  const done = main.filter((t) => t.is_done)
  const pending = main.filter((t) => !t.is_done)
  const today = todayISO()
  const email = session?.user.email ?? ''

  // atividade por dia = tarefas concluídas + hábitos marcados
  const activity = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of done) if (t.completed_at) {
      const k = toISODate(new Date(t.completed_at))
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    for (const l of logs) m.set(l.log_date, (m.get(l.log_date) ?? 0) + 1)
    return m
  }, [done, logs])

  const heat = useMemo(() => {
    const start = startOfWeek(subWeeks(new Date(), WEEKS - 1))
    return Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const date = addDays(start, w * 7 + d)
        const iso = toISODate(date)
        return { iso, future: iso > today, n: activity.get(iso) ?? 0 }
      }),
    )
  }, [activity, today])
  const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4)
  const activeDays = [...activity.keys()].filter((k) => k >= toISODate(subDays(new Date(), 30))).length

  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => toISODate(subDays(new Date(), 6 - i)))
    return days.map((d) => ({
      day: d,
      tasks: done.filter((t) => t.completed_at && toISODate(new Date(t.completed_at)) === d).length,
      focus: Math.round(sessions.filter((s) => toISODate(new Date(s.started_at)) === d).reduce((a, s) => a + s.duration_seconds, 0) / 60),
    }))
  }, [done, sessions])
  const maxTasks = Math.max(1, ...week.map((w) => w.tasks))
  const weekFocus = week.reduce((a, w) => a + w.focus, 0)
  const focusToday = week[6].focus

  const habitsToday = habits.filter((h) => !h.archived && isScheduled(h, new Date()))
  const habitsDone = habitsToday.filter((h) => doneSet(h.id).has(today)).length

  const perCategory = useMemo(() => {
    const since = subDays(new Date(), 30).toISOString()
    const recent = done.filter((t) => (t.completed_at ?? '') >= since)
    return [
      ...categories.map((c) => ({ name: c.name, count: recent.filter((t) => t.category_id === c.id).length })),
      { name: 'Sem categoria', count: recent.filter((t) => !t.category_id).length },
    ]
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [done, categories])
  const catMax = Math.max(1, ...perCategory.map((r) => r.count))

  const limit = toISODate(addDays(new Date(), 7))
  const upcoming = pending
    .filter((t) => t.due_date && t.due_date >= today && t.due_date <= limit)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
    .slice(0, 6)

  return (
    <div className="page">
      <PageHeader
        title="Resumo"
        subtitle={email}
        left={<span className="avatar" aria-hidden="true">{email.charAt(0).toUpperCase()}</span>}
        right={
          <>
            <button className="icon-btn" aria-label="Foco" onClick={() => navigate('/foco')}>
              <Icon name="timer" />
            </button>
            <button className="icon-btn" aria-label="Ajustes" onClick={() => navigate('/ajustes')}>
              <Icon name="gear" />
            </button>
          </>
        }
      />

      <main className="content me">
        <div className="stat-grid">
          <button className="stat link" onClick={() => navigate('/')}>
            <strong>{pending.length}</strong>
            <span>Pendentes</span>
          </button>
          <div className="stat">
            <strong>{done.length}</strong>
            <span>Concluídas</span>
          </div>
          <button className="stat link" onClick={() => navigate('/foco')}>
            <strong>
              {focusToday}
              <small>min</small>
            </strong>
            <span>Foco hoje</span>
          </button>
          <button className="stat link" onClick={() => navigate('/habitos')}>
            <strong>
              {habitsDone}
              <small>/{habitsToday.length}</small>
            </strong>
            <span>Hábitos hoje</span>
          </button>
        </div>

        <section className="panel">
          <h2>Constância</h2>
          <p className="panel-sub">
            {activeDays ? `${activeDays} dias com atividade no último mês` : 'Conclua tarefas e hábitos para preencher o mapa'}
          </p>
          <div className="heatmap-wrap">
            <div className="heatmap" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
              {heat.map((col, w) => (
                <div key={w} className="heat-col">
                  {col.map((c) => (
                    <i
                      key={c.iso}
                      className={c.future ? 'future' : `l${level(c.n)}`}
                      title={`${format(parseISO(c.iso), 'dd/MM')}: ${c.n}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="heat-legend">
            Menos <i className="l0" /> <i className="l1" /> <i className="l2" /> <i className="l3" /> <i className="l4" /> Mais
          </div>
        </section>

        <section className="panel">
          <h2>Últimos 7 dias</h2>
          <p className="panel-sub">
            {week.reduce((a, w) => a + w.tasks, 0)} tarefas concluídas · {weekFocus} min de foco
          </p>
          <div className="bars">
            {week.map((w) => (
              <div key={w.day} className="bar-col">
                <span className="bar-num">{w.tasks || ''}</span>
                <div className="bar-track">
                  <div className="bar" style={{ height: `${(w.tasks / maxTasks) * 100}%` }} />
                </div>
                <span className={w.day === today ? 'bar-label today' : 'bar-label'}>{format(parseISO(w.day), 'EEEEEE', { locale: ptBR })}</span>
              </div>
            ))}
          </div>
        </section>

        {perCategory.length > 0 && (
          <section className="panel">
            <h2>Por categoria</h2>
            <p className="panel-sub">Concluídas nos últimos 30 dias</p>
            <ul className="hbars">
              {perCategory.map((r) => (
                <li key={r.name}>
                  <span className="hbar-name">{r.name}</span>
                  <span className="hbar-track">
                    <span className="hbar" style={{ width: `${(r.count / catMax) * 100}%` }} />
                  </span>
                  <span className="hbar-num">{r.count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="panel">
          <h2>Próximos 7 dias</h2>
          {upcoming.length === 0 ? (
            <p className="panel-sub">Nada agendado. Aproveite.</p>
          ) : (
            <ul className="task-list flat">
              {upcoming.map((t) => (
                <TaskItem key={t.id} task={t} showCategory />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
