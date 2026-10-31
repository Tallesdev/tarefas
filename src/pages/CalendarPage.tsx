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
import { useMemo, useRef, useState, type PointerEvent } from 'react'
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
  // arrastar para o lado troca o mês
  const [dragX, setDragX] = useState(0)
  const [enter, setEnter] = useState<'next' | 'prev' | null>(null)
  const swipe = useRef({ x: 0, y: 0, t: 0, axis: null as 'x' | 'y' | null, active: false, moved: false })

  const goMonth = (dir: 1 | -1) => {
    setMonth((m) => addMonths(m, dir))
    setEnter(dir === 1 ? 'next' : 'prev')
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    swipe.current = { x: e.clientX, y: e.clientY, t: Date.now(), axis: null, active: true, moved: false }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = swipe.current
    if (!s.active) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (!s.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (s.axis === 'x') e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (s.axis === 'x') {
      s.moved = true
      setDragX(dx)
    }
  }
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const s = swipe.current
    if (!s.active) return
    s.active = false
    if (s.axis === 'x') {
      const dx = e.clientX - s.x
      const fast = Math.abs(dx) > 30 && Date.now() - s.t < 250
      if (Math.abs(dx) > 70 || fast) goMonth(dx < 0 ? 1 : -1)
    }
    setDragX(0)
  }

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
        <button className="icon-btn" aria-label="Mês anterior" onClick={() => goMonth(-1)}>
          <Icon name="chevronLeft" />
        </button>
        <h1 className="cal-title">{title}</h1>
        <button className="icon-btn" aria-label="Próximo mês" onClick={() => goMonth(1)}>
          <Icon name="chevronRight" />
        </button>
        <button
          className="btn-text today-btn"
          onClick={() => {
            const now = startOfMonth(new Date())
            if (now.getTime() !== month.getTime()) setEnter(now > month ? 'next' : 'prev')
            setMonth(now)
            setSelected(todayISO())
          }}
        >
          Hoje
        </button>
      </header>

      <div
        className="cal-swipe"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(e) => {
          // um arrasto não deve selecionar o dia onde o dedo soltou
          if (swipe.current.moved) {
            e.stopPropagation()
            swipe.current.moved = false
          }
        }}
      >
      <div
        key={toISODate(month)}
        className={`cal-grid ${enter ? `enter-${enter}` : ''} ${dragX ? 'dragging' : ''}`}
        style={dragX ? { transform: `translateX(${dragX * 0.6}px)`, opacity: 1 - Math.min(Math.abs(dragX) / 600, 0.4) } : undefined}
        onAnimationEnd={() => setEnter(null)}
        role="grid"
        aria-label={title}
      >
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
                if (!isSameMonth(d, month)) goMonth(d > month ? 1 : -1)
                // tocar no dia já abre a criação de tarefa para ele
                setAdding(true)
              }}
            >
              <span>{format(d, 'd')}</span>
              {info && <i className={info.pending ? 'dot' : 'dot done'} />}
            </button>
          )
        })}
      </div>
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
          <EmptyState title="Dia livre" hint="Toque no dia ou em + para planejar algo." />
        )}
      </main>

      <button className="fab" aria-label="Nova tarefa neste dia" onClick={() => setAdding(true)}>
        <Icon name="plus" size={28} />
      </button>
      <QuickAdd open={adding} onClose={() => setAdding(false)} defaultDate={selected} />
    </div>
  )
}
