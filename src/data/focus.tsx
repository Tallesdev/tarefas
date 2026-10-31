import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export type FocusSession = { id: string; task_id: string | null; started_at: string; duration_seconds: number }

type Ctx = { sessions: FocusSession[]; addSession: (s: Omit<FocusSession, 'id'>) => Promise<void> }
const FocusContext = createContext<Ctx | null>(null)

export function FocusProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [sessions, setSessions] = useState<FocusSession[]>([])

  useEffect(() => {
    const since = new Date(Date.now() - 90 * 864e5).toISOString()
    supabase
      .from('focus_sessions')
      .select('id,task_id,started_at,duration_seconds')
      .is('deleted_at', null)
      .gte('started_at', since)
      .then(({ data }) => data && setSessions(data as FocusSession[]))
  }, [userId])

  const addSession = useCallback(
    async (s: Omit<FocusSession, 'id'>) => {
      const row = { id: crypto.randomUUID(), user_id: userId, ...s }
      setSessions((x) => [...x, row])
      const { error } = await supabase.from('focus_sessions').insert(row)
      if (error) console.error(error)
    },
    [userId],
  )

  return <FocusContext.Provider value={{ sessions, addSession }}>{children}</FocusContext.Provider>
}

export function useFocus() {
  const ctx = useContext(FocusContext)
  if (!ctx) throw new Error('useFocus precisa estar dentro de FocusProvider')
  return ctx
}
