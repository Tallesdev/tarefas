import { useState } from 'react'

type Props = {
  title: string
  initial?: string
  confirmLabel: string
  onConfirm: (name: string) => void
  onCancel: () => void
  onDelete?: () => void
}

export default function NameDialog({ title, initial = '', confirmLabel, onConfirm, onCancel, onDelete }: Props) {
  const [name, setName] = useState(initial)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const valid = name.trim().length > 0

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <form
        className="dialog"
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onConfirm(name.trim())
        }}
      >
        <h2>{title}</h2>
        <input
          autoFocus
          className="field"
          value={name}
          maxLength={50}
          placeholder="Nome da categoria"
          onChange={(e) => setName(e.target.value)}
        />
        <div className="field-hint">{name.length}/50</div>
        <div className="dialog-actions">
          {onDelete &&
            (confirmDelete ? (
              <button type="button" className="btn-text danger" onClick={onDelete}>
                Confirmar exclusão
              </button>
            ) : (
              <button type="button" className="btn-text danger" onClick={() => setConfirmDelete(true)}>
                Excluir
              </button>
            ))}
          <span className="spacer" />
          <button type="button" className="btn-text" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn-text primary" disabled={!valid}>
            {confirmLabel}
          </button>
        </div>
        {confirmDelete && <p className="field-hint">As tarefas desta categoria ficam sem categoria.</p>}
      </form>
    </div>
  )
}
