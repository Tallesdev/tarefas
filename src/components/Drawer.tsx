import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../data/store'
import type { Category } from '../lib/types'
import Icon from './Icon'
import NameDialog from './NameDialog'

type Props = {
  open: boolean
  onClose: () => void
  activeId: string | 'all'
  onSelect: (id: string | 'all') => void
}

export default function Drawer({ open, onClose, activeId, onSelect }: Props) {
  const { categories, tasks, addCategory, renameCategory, deleteCategory } = useStore()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  const pending = (id: string | 'all') =>
    tasks.filter((t) => !t.parent_id && !t.is_done && (id === 'all' || t.category_id === id)).length

  const pick = (id: string | 'all') => {
    onSelect(id)
    onClose()
  }

  return (
    <>
      <div className={`drawer-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="drawer-brand"><span className="brand-mark" aria-hidden="true"><Icon name="check" size={16} /></span>Tarefas</div>

        <nav className="drawer-list" aria-label="Categorias">
          <button className={`drawer-item ${activeId === 'all' ? 'active' : ''}`} onClick={() => pick('all')}>
            <Icon name="folder" size={18} />
            <span>Todas as tarefas</span>
            <span className="count">{pending('all')}</span>
          </button>
          {categories.map((c) => (
            <div key={c.id} className="drawer-row">
              <button className={`drawer-item ${activeId === c.id ? 'active' : ''}`} onClick={() => pick(c.id)}>
                <Icon name="folder" size={18} />
                <span>{c.name}</span>
                <span className="count">{pending(c.id)}</span>
              </button>
              <button className="icon-btn small" aria-label={`Editar ${c.name}`} onClick={() => setEditing(c)}>
                <Icon name="pencil" size={16} />
              </button>
            </div>
          ))}
          <button className="drawer-item add" onClick={() => setCreating(true)}>
            <Icon name="plus" size={18} />
            <span>Nova categoria</span>
          </button>
        </nav>

        <div className="drawer-footer">
          {(
            [
              ['/habitos', 'target', 'Hábitos'],
              ['/foco', 'timer', 'Foco'],
              ['/sugestoes', 'clipboard', 'Sugestões de tarefas'],
              ['/ajustes', 'gear', 'Ajustes'],
            ] as const
          ).map(([to, icon, label]) => (
            <button
              key={to}
              className="drawer-item"
              onClick={() => {
                onClose()
                navigate(to)
              }}
            >
              <Icon name={icon} size={18} />
              <span>{label}</span>
            </button>
          ))}
          <button className="drawer-item muted" onClick={() => supabase.auth.signOut()}>
            <Icon name="logout" size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {creating && (
        <NameDialog
          title="Nova categoria"
          confirmLabel="Criar"
          onCancel={() => setCreating(false)}
          onConfirm={async (name) => {
            setCreating(false)
            await addCategory(name)
          }}
        />
      )}
      {editing && (
        <NameDialog
          title="Editar categoria"
          initial={editing.name}
          confirmLabel="Salvar"
          onCancel={() => setEditing(null)}
          onConfirm={async (name) => {
            const id = editing.id
            setEditing(null)
            await renameCategory(id, name)
          }}
          onDelete={async () => {
            const id = editing.id
            setEditing(null)
            if (activeId === id) onSelect('all')
            await deleteCategory(id)
          }}
        />
      )}
    </>
  )
}
