import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import PageHeader from '../components/PageHeader'
import { useFocus } from '../data/focus'
import { useSettings } from '../data/settings'
import { useStore } from '../data/store'
import { toISODate } from '../lib/dates'
import { localNotify } from '../lib/push'

type Mode = 'focus' | 'break'
type TimerState = {
  mode: Mode
  total: number // segundos do ciclo atual
  remaining: number // quando pausado
  endsAt: number | null // quando rodando
  startedAt: string | null
  taskId: string | null
}

const KEY = 'tarefas-focus'
const FOCUS_OPTIONS = [15, 25, 45, 60]
const BREAK_OPTIONS = [5, 10, 15]

function loadState(focusMin: number): TimerState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    if (s && s.mode) return s
  } catch {
    /* sem estado salvo */
  }
  return { mode: 'focus', total: focusMin * 60, remaining: focusMin * 60, endsAt: null, startedAt: null, taskId: null }
}

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

export default function FocusPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { tasks } = useStore()
  const { sessions, addSession } = useFocus()
  const { settings, updateSettings } = useSettings()
  const focusMin = settings.focusMinutes ?? 25
  const breakMin = settings.breakMinutes ?? 5

  const [state, setState] = useState<TimerState>(() => {
    const s = loadState(focusMin)
    const fromLink = params.get('tarefa')
    return fromLink && !s.endsAt ? { ...s, taskId: fromLink } : s
  })
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignora */
    }
  }, [state])

  const remaining = state.endsAt ? Math.max(0, Math.round((state.endsAt - now) / 1000)) : state.remaining
  const running = state.endsAt !== null

  const finish = useCallback(
    (s: TimerState) => {
      if (s.mode === 'focus') {
        addSession({ task_id: s.taskId, started_at: s.startedAt ?? new Date(Date.now() - s.total * 1000).toISOString(), duration_seconds: s.total })
        localNotify('Foco concluído', `Bom trabalho! Hora de uma pausa de ${breakMin} min.`)
        setState({ ...s, mode: 'break', total: breakMin * 60, remaining: breakMin * 60, endsAt: null, startedAt: null })
      } else {
        localNotify('Pausa terminou', 'Pronto para mais um ciclo de foco?')
        setState({ ...s, mode: 'focus', total: focusMin * 60, remaining: focusMin * 60, endsAt: null, startedAt: null })
      }
      navigator.vibrate?.([200, 100, 200])
    },
    [addSession, breakMin, focusMin],
  )

  // relógio: recalcula pelo horário de término (funciona mesmo se o app ficou em segundo plano)
  useEffect(() => {
    if (!running) return
    const tick = () => setNow(Date.now())
    const t = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [running])

  useEffect(() => {
    if (running && remaining === 0) finish(state)
  }, [running, remaining, state, finish])

  const start = () => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
    setNow(Date.now())
    setState((s) => ({ ...s, endsAt: Date.now() + s.remaining * 1000, startedAt: s.startedAt ?? new Date().toISOString() }))
  }
  const pause = () => setState((s) => ({ ...s, remaining, endsAt: null }))
  const reset = () => setState((s) => ({ ...s, remaining: s.total, endsAt: null, startedAt: null }))
  const skip = () => {
    const nextMode: Mode = state.mode === 'focus' ? 'break' : 'focus'
    const total = (nextMode === 'focus' ? focusMin : breakMin) * 60
    setState((s) => ({ ...s, mode: nextMode, total, remaining: total, endsAt: null, startedAt: null }))
  }
  const choose = (min: number) => {
    if (running) return
    if (state.mode === 'focus') updateSettings({ focusMinutes: min })
    else updateSettings({ breakMinutes: min })
    setState((s) => ({ ...s, total: min * 60, remaining: min * 60, startedAt: null }))
  }

  const pending = tasks.filter((t) => !t.parent_id && !t.is_done)
  const linked = tasks.find((t) => t.id === state.taskId)

  const today = toISODate(new Date())
  const todaySessions = useMemo(() => sessions.filter((s) => toISODate(new Date(s.started_at)) === today), [sessions, today])
  const todayMin = Math.round(todaySessions.reduce((a, s) => a + s.duration_seconds, 0) / 60)

  const R = 120
  const C = 2 * Math.PI * R
  const progress = state.total ? 1 - remaining / state.total : 0
  const options = state.mode === 'focus' ? FOCUS_OPTIONS : BREAK_OPTIONS
  const current = Math.round(state.total / 60)

  return (
    <div className={`page focus-page mode-${state.mode}`}>
      <PageHeader
        title="Foco"
        subtitle={todaySessions.length ? `Hoje: ${todayMin} min em ${todaySessions.length} ${todaySessions.length === 1 ? 'sessão' : 'sessões'}` : 'Um ciclo de cada vez'}
        left={
          <button className="icon-btn" aria-label="Voltar" onClick={() => navigate(-1)}>
            <Icon name="back" />
          </button>
        }
      />
      <main className="content focus">
        <div className="segmented small">
          <button className={state.mode === 'focus' ? 'on' : ''} onClick={() => !running && state.mode !== 'focus' && skip()}>
            Foco
          </button>
          <button className={state.mode === 'break' ? 'on' : ''} onClick={() => !running && state.mode !== 'break' && skip()}>
            Pausa
          </button>
        </div>

        <div className="ring" role="timer" aria-live="off" aria-label={`${mmss(remaining)} restantes`}>
          <svg viewBox="0 0 280 280">
            <circle cx="140" cy="140" r={R} className="ring-track" />
            <circle
              cx="140"
              cy="140"
              r={R}
              className="ring-bar"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              transform="rotate(-90 140 140)"
            />
          </svg>
          <div className="ring-center">
            <span className="ring-time">{mmss(remaining)}</span>
            <span className="ring-label">{state.mode === 'focus' ? (running ? 'Concentrado' : 'Foco') : 'Pausa'}</span>
          </div>
        </div>

        <div className="durations" aria-label="Duração">
          {options.map((m) => (
            <button key={m} className={`chip ${current === m ? 'on' : ''}`} disabled={running} onClick={() => choose(m)}>
              {m} min
            </button>
          ))}
        </div>

        <div className="controls">
          <button className="round-btn" aria-label="Reiniciar" onClick={reset}>
            <Icon name="reset" />
          </button>
          <button className="play-btn" aria-label={running ? 'Pausar' : 'Iniciar'} onClick={running ? pause : start}>
            <Icon name={running ? 'pause' : 'play'} size={30} />
          </button>
          <button className="round-btn" aria-label="Pular" onClick={skip}>
            <Icon name="skip" />
          </button>
        </div>

        <label className="row plain focus-task">
          <Icon name="tasks" />
          <span>Focar em</span>
          <select value={state.taskId ?? ''} onChange={(e) => setState((s) => ({ ...s, taskId: e.target.value || null }))}>
            <option value="">Nenhuma tarefa</option>
            {linked && linked.is_done && <option value={linked.id}>{linked.title}</option>}
            {pending.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
      </main>
    </div>
  )
}
