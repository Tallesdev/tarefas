import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Settings } from '../lib/suggestions'
import { applyTheme, storedTheme } from '../lib/theme'

type Ctx = { settings: Settings; updateSettings: (patch: Partial<Settings>) => Promise<void> }

const SettingsContext = createContext<Ctx | null>(null)

// Preferências ficam em profiles.settings (jsonb), sincronizadas entre aparelhos.
// O tema também fica no localStorage para abrir já com a cor certa.
export function SettingsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const local = storedTheme()
  const [settings, setSettings] = useState<Settings>({ theme: local.mode, accent: local.accent })
  const latest = useRef<Settings>(settings)

  const save = useCallback(
    async (next: Settings) => {
      const { error } = await supabase.from('profiles').upsert({ id: userId, settings: next })
      if (error) console.error(error)
    },
    [userId],
  )

  useEffect(() => {
    supabase
      .from('profiles')
      .select('settings')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        const remote = (data?.settings ?? {}) as Settings
        const merged: Settings = { theme: local.mode, accent: local.accent, ...remote }
        latest.current = merged
        setSettings(merged)
        // fuso horário usado pelos lembretes no servidor
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (tz && remote.timezone !== tz) {
          latest.current = { ...merged, timezone: tz }
          save(latest.current)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // aplica tema/cor e acompanha a troca automática claro/escuro do sistema
  useEffect(() => {
    const mode = settings.theme ?? 'system'
    const accent = settings.accent ?? 'grafite'
    applyTheme(mode, accent)
    if (mode !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme(mode, accent)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [settings.theme, settings.accent])

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...latest.current, ...patch }
      latest.current = next
      setSettings(next)
      await save(next)
    },
    [save],
  )

  return <SettingsContext.Provider value={{ settings, updateSettings }}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings precisa estar dentro de SettingsProvider')
  return ctx
}
