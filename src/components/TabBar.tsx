import { NavLink } from 'react-router-dom'
import Icon from './Icon'

export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      <NavLink to="/" end className="tab">
        <Icon name="tasks" />
        <span>Tarefas</span>
      </NavLink>
      <NavLink to="/calendario" className="tab">
        <Icon name="calendar" />
        <span>Calendário</span>
      </NavLink>
      <NavLink to="/meus" className="tab">
        <Icon name="user" />
        <span>Meus</span>
      </NavLink>
    </nav>
  )
}
