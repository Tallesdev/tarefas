import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import QuickAdd from '../components/QuickAdd'
import TaskItem from '../components/TaskItem'
import { useStore } from '../data/store'
import { capitalize, toISODate, todayISO } from '../lib/dates'

const WEEK = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export default function CalendarPage() {
  const { tasks } = useStore()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(todayISO())
  const [adding, setAdding] = useState(false)

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }),
    [month],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, { pending: number; done: number }>()
    for (const t of tasks) {
      if (t.parent_id || !t.due_date) continue
      const v = map.get(t.due_date) ?? { pending: 0, done: 0 }
      if (t.is_done) v.done++
      else v.pending++
      map.set(t.due_date, v)
    }
    return map
  }, [tasks])

  const dayTasks = tasks
    .filter((t) => !t.parent_id && t.due_date === selected)
    .sort((a, b) => Number(a.is_done) - Number(b.is_done) || (a.due_time ?? '99').localeCompare(b.due_time ?? '99'))

  const title = capitalize(format(month, "MMMM 'de' yyyy", { locale: ptBR }))

  return (
    <div className="page">
      <header className="top cal-top">
        <button className="icon-btn" aria-label="Mês anterior" onClick={() => setMonth((m) => addMonths(m, -1))}>
          <Icon name="chevronLeft" />
        </button>
        <h1 className="cal-title">{title}</h1>
        <button className="icon-btn" aria-label="Próximo mês" onClick={() => setMonth((m) => addMonths(m, 1))}>
          <Icon name="chevronRight" />
        </button>
        <button
          className="btn-text today-btn"
          onClick={() => {
            setMonth(startOfMonth(new Date()))
            setSelected(todayISO())
          }}
        >
          Hoje
        </button>
      </header>

      <div className="cal-grid" role="grid" aria-label={title}>
        {WEEK.map((w) => (
          <div key={w} className="cal-week">
            {w}
          </div>
        ))}
        {days.map((d) => {
          const iso = toISODate(d)
          const info = byDay.get(iso)
          return (
            <button
              key={iso}
              role="gridcell"
              aria-selected={iso === selected}
              className={[
                'cal-day',
                isSameMonth(d, month) ? '' : 'out',
                isToday(d) ? 'today' : '',
                iso === selected ? 'sel' : '',
              ].join(' ')}
              onClick={() => {
                setSelected(iso)
                if (!isSameMonth(d, month)) setMonth(startOfMonth(d))
              }}
            >
              <span>{format(d, 'd')}</span>
              {info && <i className={info.pending ? 'dot' : 'dot done'} />}
            </button>
          )
        })}
      </div>

      <main className="content cal-list">
        <h2 className="day-title">{capitalize(format(parseISO(selected), "EEEE, d 'de' MMMM", { locale: ptBR }))}</h2>
        {dayTasks.length ? (
          <ul className="task-list">
            {dayTasks.map((t) => (
              <TaskItem key={t.id} task={t} showCategory />
            ))}
          </ul>
        ) : (
          <EmptyState title="Dia livre" hint="Toque em + para planejar algo para este dia." />
        )}
      </main>

      <button className="fab" aria-label="Nova tarefa neste dia" onClick={() => setAdding(true)}>
        <Icon name="plus" size={28} />
      </button>
      <QuickAdd open={adding} onClose={() => setAdding(false)} defaultDate={selected} />
    </div>
  )
}
