import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Drawer from '../components/Drawer'
import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import QuickAdd from '../components/QuickAdd'
import TaskItem from '../components/TaskItem'
import { useStore } from '../data/store'
import { capitalize, groupOf, groupTitles, todayISO, type Group } from '../lib/dates'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Task } from '../lib/types'

const ORDER: Group[] = ['atrasadas', 'hoje', 'futuras', 'sem-data', 'concluidas']

const byDue = (a: Task, b: Task) =>
  (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') ||
  (a.due_time ?? '99').localeCompare(b.due_time ?? '99') ||
  a.created_at.localeCompare(b.created_at)

export default function TasksPage() {
  const { ready, categories, tasks } = useStore()
  const [params, setParams] = useSearchParams()
  const active = params.get('c') ?? 'all'
  const setActive = (id: string) => setParams(id === 'all' ? {} : { c: id }, { replace: true })
  const [drawer, setDrawer] = useState(false)
  const [adding, setAdding] = useState(false)
  const [showDone, setShowDone] = useState(false)

  const groups = useMemo(() => {
    const visible = tasks.filter((t) => !t.parent_id && (active === 'all' || t.category_id === active))
    const map = new Map<Group, Task[]>()
    for (const t of visible) {
      const g = groupOf(t)
      map.set(g, [...(map.get(g) ?? []), t])
    }
    for (const [g, list] of map) {
      list.sort(g === 'concluidas' ? (a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '') : byDue)
    }
    return map
  }, [tasks, active])

  const hasAny = ORDER.some((g) => groups.get(g)?.length)
  const today = todayISO()
  const todayTasks = tasks.filter((t) => !t.parent_id && t.due_date === today && (active === 'all' || t.category_id === active))
  const todayDone = todayTasks.filter((t) => t.is_done).length
  const todayTotal = todayTasks.length

  return (
    <div className="page">
      <PageHeader
        title={active === 'all' ? 'Tarefas' : (categories.find((c) => c.id === active)?.name ?? 'Tarefas')}
        subtitle={
          <>
            {capitalize(format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }))}
            {todayTotal > 0 && (
              <span className="today-progress">
                {' · '}
                {todayDone} de {todayTotal} de hoje
              </span>
            )}
          </>
        }
        left={
          <button className="icon-btn" aria-label="Abrir menu" onClick={() => setDrawer(true)}>
            <Icon name="menu" />
          </button>
        }
      >
        <div className="chips" role="tablist" aria-label="Filtrar por categoria">
          <button role="tab" aria-selected={active === 'all'} className={`chip ${active === 'all' ? 'on' : ''}`} onClick={() => setActive('all')}>
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={active === c.id}
              className={`chip ${active === c.id ? 'on' : ''}`}
              onClick={() => setActive(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        {todayTotal > 0 && (
          <div className="progress" aria-hidden="true">
            <i style={{ width: `${(todayDone / todayTotal) * 100}%` }} />
          </div>
        )}
      </PageHeader>

      <main className="content">
        {!ready ? (
          <div className="loading">Carregando…</div>
        ) : !hasAny ? (
          <EmptyState title="Tudo em dia" hint="Nenhuma tarefa por aqui. Toque em + para criar." />
        ) : (
          ORDER.map((g) => {
            const list = groups.get(g)
            if (!list?.length) return null
            const collapsible = g === 'concluidas'
            const open = !collapsible || showDone
            return (
              <section key={g} className={`group group-${g}`}>
                <button
                  className="group-head"
                  onClick={() => collapsible && setShowDone((v) => !v)}
                  aria-expanded={open}
                  disabled={!collapsible}
                >
                  <span>{groupTitles[g]}</span>
                  <span className="group-count">{list.length}</span>
                  {collapsible && (
                    <span className={`chev ${open ? 'up' : ''}`}>
                      <Icon name="chevronDown" size={16} />
                    </span>
                  )}
                </button>
                {open && (
                  <ul className="task-list">
                    {list.map((t) => (
                      <TaskItem key={t.id} task={t} showCategory={active === 'all'} />
                    ))}
                  </ul>
                )}
              </section>
            )
          })
        )}
      </main>

      <button className="fab" aria-label="Nova tarefa" onClick={() => setAdding(true)}>
        <Icon name="plus" size={26} />
      </button>

      <QuickAdd open={adding} onClose={() => setAdding(false)} defaultCategoryId={active === 'all' ? null : active} />
      <Drawer open={drawer} onClose={() => setDrawer(false)} activeId={active} onSelect={setActive} />
    </div>
  )
}
