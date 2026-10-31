import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Habit, HabitLog } from '../lib/habits'
import { supabase } from '../lib/supabase'
import { useStore } from './store'

type NewHabit = Pick<Habit, 'name' | 'icon' | 'kind' | 'week_days' | 'reminder_time'>

type Ctx = {
  habits: Habit[]
  logs: HabitLog[]
  doneSet: (habitId: string) => Set<string>
  toggleLog: (habitId: string, date: string) => Promise<void>
  addHabit: (h: NewHabit) => Promise<Habit>
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
}

const HabitsContext = createContext<Ctx | null>(null)
const COLS = 'id,user_id,name,icon,color,kind,week_days,reminder_time,archived,created_at'

export function HabitsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const { reportError } = useStore()
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10)
    const [h, l] = await Promise.all([
      supabase.from('habits').select(COLS).is('deleted_at', null).order('created_at'),
      supabase.from('habit_logs').select('id,user_id,habit_id,log_date').is('deleted_at', null).gte('log_date', since),
    ])
    if (!h.error) setHabits(h.data as Habit[])
    if (!l.error) setLogs(l.data as HabitLog[])
  }, [])

  useEffect(() => {
    load()
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const byHabit = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const l of logs) {
      if (!m.has(l.habit_id)) m.set(l.habit_id, new Set())
      m.get(l.habit_id)!.add(l.log_date)
    }
    return m
  }, [logs])

  const doneSet = useCallback((id: string) => byHabit.get(id) ?? new Set<string>(), [byHabit])

  const toggleLog = useCallback(
    async (habitId: string, date: string) => {
      const existing = logs.find((l) => l.habit_id === habitId && l.log_date === date)
      if (existing) {
        setLogs((x) => x.filter((l) => l.id !== existing.id))
        const { error } = await supabase.from('habit_logs').delete().eq('id', existing.id)
        if (error) {
          reportError('Não foi possível atualizar o hábito.')
          load()
        }
      } else {
        const log: HabitLog = { id: crypto.randomUUID(), user_id: userId, habit_id: habitId, log_date: date }
        setLogs((x) => [...x, log])
        const { error } = await supabase.from('habit_logs').insert(log)
        if (error) {
          reportError('Não foi possível atualizar o hábito.')
          load()
        }
      }
    },
    [load, logs, reportError, userId],
  )

  const addHabit = useCallback(
    async (h: NewHabit) => {
      const habit: Habit = {
        id: crypto.randomUUID(),
        user_id: userId,
        color: null,
        archived: false,
        created_at: new Date().toISOString(),
        ...h,
      }
      setHabits((x) => [...x, habit])
      const { created_at: _c, ...row } = habit
      const { error } = await supabase.from('habits').insert(row)
      if (error) {
        reportError('Não foi possível criar o hábito.')
        load()
      }
      return habit
    },
    [load, reportError, userId],
  )

  const updateHabit = useCallback(
    async (id: string, patch: Partial<Habit>) => {
      setHabits((x) => x.map((h) => (h.id === id ? { ...h, ...patch } : h)))
      const { error } = await supabase.from('habits').update(patch).eq('id', id)
      if (error) {
        reportError('Não foi possível salvar o hábito.')
        load()
      }
    },
    [load, reportError],
  )

  const deleteHabit = useCallback(
    async (id: string) => {
      setHabits((x) => x.filter((h) => h.id !== id))
      const { error } = await supabase.from('habits').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) {
        reportError('Não foi possível excluir o hábito.')
        load()
      }
    },
    [load, reportError],
  )

  return (
    <HabitsContext.Provider value={{ habits, logs, doneSet, toggleLog, addHabit, updateHabit, deleteHabit }}>
      {children}
    </HabitsContext.Provider>
  )
}

export function useHabits() {
  const ctx = useContext(HabitsContext)
  if (!ctx) throw new Error('useHabits precisa estar dentro de HabitsProvider')
  return ctx
}
