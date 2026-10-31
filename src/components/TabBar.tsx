import { NavLink } from 'react-router-dom'
import Icon, { type IconName } from './Icon'

const MAIN: [string, IconName, string][] = [
  ['/', 'tasks', 'Tarefas'],
  ['/calendario', 'calendar', 'Calendário'],
  ['/habitos', 'target', 'Hábitos'],
  ['/meus', 'user', 'Meus'],
]
// no computador a barra vira menu lateral e mostra também estes
const EXTRA: [string, IconName, string][] = [
  ['/foco', 'timer', 'Foco'],
  ['/ajustes', 'gear', 'Ajustes'],
]

export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      <div className="tabbar-brand">
        <span className="brand-mark" aria-hidden="true">
          <Icon name="check" size={16} />
        </span>
        Tarefas
      </div>
      {MAIN.map(([to, icon, label]) => (
        <NavLink key={to} to={to} end={to === '/'} className="tab">
          <Icon name={icon} />
          <span>{label}</span>
        </NavLink>
      ))}
      {EXTRA.map(([to, icon, label]) => (
        <NavLink key={to} to={to} className="tab extra">
          <Icon name={icon} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
