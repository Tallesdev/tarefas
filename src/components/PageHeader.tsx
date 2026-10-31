import type { ReactNode } from 'react'

type Props = { title: string; subtitle?: ReactNode; left?: ReactNode; right?: ReactNode; children?: ReactNode }

// Cabeçalho com título grande; fica fixo no topo ao rolar
export default function PageHeader({ title, subtitle, left, right, children }: Props) {
  return (
    <header className="page-head">
      <div className="page-head-bar">
        {left}
        <div className="page-head-text">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {right && <div className="page-head-actions">{right}</div>}
      </div>
      {children}
    </header>
  )
}
