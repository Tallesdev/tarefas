import { useNavigate } from 'react-router-dom'
import { dueLabel, isOverdue } from '../lib/dates'
import type { Task } from '../lib/types'
import { useStore } from '../data/store'
import Icon from './Icon'

export default function TaskItem({ task, showCategory }: { task: Task; showCategory?: boolean }) {
  const { tasks, categories, toggleTask } = useStore()
  const navigate = useNavigate()
  const subtasks = tasks.filter((t) => t.parent_id === task.id)
  const doneSubs = subtasks.filter((t) => t.is_done).length
  const label = dueLabel(task)
  const category = showCategory ? categories.find((c) => c.id === task.category_id) : null

  return (
    <li className={`task ${task.is_done ? 'is-done' : ''}`}>
      <button
        className="check"
        aria-label={task.is_done ? 'Marcar como pendente' : 'Concluir tarefa'}
        aria-pressed={task.is_done}
        onClick={() => toggleTask(task.id)}
      >
        <Icon name="check" size={14} />
      </button>
      <button className="task-body" onClick={() => navigate(`/tarefa/${task.id}`)}>
        <span className="task-title">{task.title}</span>
        {(label || subtasks.length > 0 || category || task.recurrence_rule) && (
          <span className="task-meta">
            {label && <span className={isOverdue(task) ? 'overdue' : ''}>{label}</span>}
            {task.recurrence_rule && <Icon name="repeat" size={13} />}
            {subtasks.length > 0 && (
              <span className="meta-sub">
                <Icon name="subtask" size={13} /> {doneSubs}/{subtasks.length}
              </span>
            )}
            {category && <span className="meta-cat">{category.name}</span>}
          </span>
        )}
      </button>
    </li>
  )
}
