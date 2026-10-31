export type ThemeMode = 'system' | 'light' | 'dark'
export type Accent = 'grafite' | 'azul' | 'esmeralda' | 'violeta' | 'coral' | 'rosa'

export const ACCENTS: { id: Accent; name: string; swatch: string }[] = [
  { id: 'grafite', name: 'Grafite', swatch: '#27272a' },
  { id: 'azul', name: 'Azul', swatch: '#2563eb' },
  { id: 'esmeralda', name: 'Esmeralda', swatch: '#059669' },
  { id: 'violeta', name: 'Violeta', swatch: '#7c3aed' },
  { id: 'coral', name: 'Coral', swatch: '#ea580c' },
  { id: 'rosa', name: 'Rosa', swatch: '#db2777' },
]

const KEY = 'tarefas-theme'

export function applyTheme(mode: ThemeMode, accent: Accent) {
  const root = document.documentElement
  const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  root.dataset.theme = dark ? 'dark' : 'light'
  root.dataset.accent = accent
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#09090b' : '#ffffff')
  try {
    localStorage.setItem(KEY, JSON.stringify({ mode, accent }))
  } catch {
    /* modo privado: segue sem guardar */
  }
}

export function storedTheme(): { mode: ThemeMode; accent: Accent } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '')
    return { mode: v.mode ?? 'system', accent: v.accent ?? 'grafite' }
  } catch {
    return { mode: 'system', accent: 'grafite' }
  }
}
