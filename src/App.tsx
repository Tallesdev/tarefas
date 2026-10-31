import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import TabBar from './components/TabBar'
import Toast from './components/Toast'
import { AuthProvider, useAuth } from './data/auth'
import { FocusProvider } from './data/focus'
import { HabitsProvider } from './data/habits'
import { SettingsProvider } from './data/settings'
import { StoreProvider } from './data/store'
import CalendarPage from './pages/CalendarPage'
import FocusPage from './pages/FocusPage'
import HabitEditPage from './pages/HabitEditPage'
import HabitsPage from './pages/HabitsPage'
import SettingsPage from './pages/SettingsPage'
import Login from './pages/Login'
import MePage from './pages/MePage'
import SuggestionsPage from './pages/SuggestionsPage'
import TaskDetailPage from './pages/TaskDetailPage'
import TasksPage from './pages/TasksPage'

function WithTabs() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}

function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <div className="splash" aria-label="Carregando" />
  if (!session) return <Login />
  return (
    <StoreProvider userId={session.user.id}>
      <SettingsProvider userId={session.user.id}>
      <HabitsProvider userId={session.user.id}>
      <FocusProvider userId={session.user.id}>
      <Routes>
        <Route element={<WithTabs />}>
          <Route path="/" element={<TasksPage />} />
          <Route path="/calendario" element={<CalendarPage />} />
          <Route path="/habitos" element={<HabitsPage />} />
          <Route path="/meus" element={<MePage />} />
          <Route path="/foco" element={<FocusPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
        </Route>
        <Route path="/tarefa/:id" element={<TaskDetailPage />} />
        <Route path="/sugestoes" element={<SuggestionsPage />} />
        <Route path="/habito/novo" element={<HabitEditPage />} />
        <Route path="/habito/:id" element={<HabitEditPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
      </FocusProvider>
      </HabitsProvider>
      </SettingsProvider>
    </StoreProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </AuthProvider>
  )
}
