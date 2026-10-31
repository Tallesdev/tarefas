import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Settings } from '../lib/suggestions'

type Ctx = { settings: Settings; updateSettings: (patch: Partial<Settings>) => Promise<void> }

const SettingsContext = createContext<Ctx | null>(null)

// Preferências ficam em profiles.settings (jsonb), sincronizadas entre aparelhos
export function SettingsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({})
  const latest = useRef<Settings>({})

  useEffect(() => {
    supabase
      .from('profiles')
      .select('settings')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.settings) {
          latest.current = data.settings as Settings
          setSettings(latest.current)
        }
      })
  }, [userId])

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...latest.current, ...patch }
      latest.current = next
      setSettings(next)
      // upsert cobre contas antigas que ainda não tenham linha em profiles
      const { error } = await supabase.from('profiles').upsert({ id: userId, settings: next })
      if (error) console.error(error)
    },
    [userId],
  )

  return <SettingsContext.Provider value={{ settings, updateSettings }}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings precisa estar dentro de SettingsProvider')
  return ctx
}
