import { addDays, format, parseISO, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMemo } from 'react'
import TaskItem from '../components/TaskItem'
import { useAuth } from '../data/auth'
import { useStore } from '../data/store'
import { toISODate, todayISO } from '../lib/dates'
import { supabase } from '../lib/supabase'

export default function MePage() {
  const { session } = useAuth()
  const { tasks, categories } = useStore()
  const main = tasks.filter((t) => !t.parent_id)
  const done = main.filter((t) => t.is_done)
  const pending = main.filter((t) => !t.is_done)

  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => toISODate(subDays(new Date(), 6 - i)))
    return days.map((d) => ({
      day: d,
      count: done.filter((t) => t.completed_at && toISODate(new Date(t.completed_at)) === d).length,
    }))
  }, [done])
  const max = Math.max(1, ...week.map((w) => w.count))
  const weekTotal = week.reduce((s, w) => s + w.count, 0)

  const perCategory = useMemo(() => {
    const since = subDays(new Date(), 30).toISOString()
    const recent = done.filter((t) => (t.completed_at ?? '') >= since)
    const rows = [
      ...categories.map((c) => ({ name: c.name, count: recent.filter((t) => t.category_id === c.id).length })),
      { name: 'Sem categoria', count: recent.filter((t) => !t.category_id).length },
    ].filter((r) => r.count > 0)
    return rows.sort((a, b) => b.count - a.count)
  }, [done, categories])
  const catMax = Math.max(1, ...perCategory.map((r) => r.count))

  const today = todayISO()
  const limit = toISODate(addDays(new Date(), 7))
  const upcoming = pending
    .filter((t) => t.due_date && t.due_date >= today && t.due_date <= limit)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))

  return (
    <div className="page">
      <header className="top me-top">
        <div>
          <div className="me-email">{session?.user.email}</div>
        </div>
        <button className="btn-text" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </header>

      <main className="content me">
        <div className="stat-pair">
          <div className="stat">
            <strong>{done.length}</strong>
            <span>Concluídas</span>
          </div>
          <div className="stat">
            <strong>{pending.length}</strong>
            <span>Pendentes</span>
          </div>
        </div>

        <section className="panel">
          <h2>Concluídas nos últimos 7 dias</h2>
          <p className="panel-sub">{weekTotal === 0 ? 'Nenhuma ainda nesta semana.' : `${weekTotal} no total`}</p>
          <div className="bars">
            {week.map((w) => (
              <div key={w.day} className="bar-col">
                <div className="bar-track">
                  <div className="bar" style={{ height: `${(w.count / max) * 100}%` }} title={`${w.count}`} />
                </div>
                <span className={w.day === today ? 'bar-label today' : 'bar-label'}>
                  {format(parseISO(w.day), 'EEEEEE', { locale: ptBR })}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Por categoria (30 dias)</h2>
          {perCategory.length === 0 ? (
            <p className="panel-sub">Conclua tarefas para ver a distribuição.</p>
          ) : (
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
          )}
        </section>

        <section className="panel">
          <h2>Próximos 7 dias</h2>
          {upcoming.length === 0 ? (
            <p className="panel-sub">Nada agendado.</p>
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
