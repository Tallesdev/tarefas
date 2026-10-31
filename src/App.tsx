import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import TabBar from './components/TabBar'
import Toast from './components/Toast'
import { AuthProvider, useAuth } from './data/auth'
import { StoreProvider } from './data/store'
import CalendarPage from './pages/CalendarPage'
import Login from './pages/Login'
import MePage from './pages/MePage'
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
      <Routes>
        <Route element={<WithTabs />}>
          <Route path="/" element={<TasksPage />} />
          <Route path="/calendario" element={<CalendarPage />} />
          <Route path="/meus" element={<MePage />} />
        </Route>
        <Route path="/tarefa/:id" element={<TaskDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
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
