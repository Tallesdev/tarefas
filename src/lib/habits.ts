import { addDays, format, subDays } from 'date-fns'

export type Habit = {
  id: string
  user_id: string
  name: string
  icon: string | null
  color: string | null
  kind: 'build' | 'quit'
  week_days: number[] // 1 = domingo ... 7 = sábado
  reminder_time: string | null
  archived: boolean
  created_at: string
}

export type HabitLog = { id: string; user_id: string; habit_id: string; log_date: string }

export const WEEKDAY_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]

const iso = (d: Date) => format(d, 'yyyy-MM-dd')
const weekdayOf = (d: Date) => d.getDay() + 1

export const isScheduled = (h: Pick<Habit, 'week_days'>, d: Date) => h.week_days.includes(weekdayOf(d))

// Sequência: dias programados seguidos com registro. Hoje ainda sem registro não quebra.
export function streak(h: Habit, done: Set<string>, today = new Date()): number {
  let n = 0
  let d = today
  if (!done.has(iso(d))) d = subDays(d, 1)
  for (let i = 0; i < 400; i++) {
    if (isScheduled(h, d)) {
      if (done.has(iso(d))) n++
      else break
    }
    d = subDays(d, 1)
  }
  return n
}

export function bestStreak(h: Habit, done: Set<string>): number {
  const dates = [...done].sort()
  if (!dates.length) return 0
  let best = 0
  let cur = 0
  let d = new Date(dates[0] + 'T12:00:00')
  const end = new Date()
  while (d <= end) {
    if (isScheduled(h, d)) {
      if (done.has(iso(d))) best = Math.max(best, ++cur)
      else cur = 0
    }
    d = addDays(d, 1)
  }
  return best
}

export function rate30(h: Habit, done: Set<string>, today = new Date()): number {
  let scheduled = 0
  let hit = 0
  for (let i = 0; i < 30; i++) {
    const d = subDays(today, i)
    if (!isScheduled(h, d)) continue
    scheduled++
    if (done.has(iso(d))) hit++
  }
  return scheduled ? Math.round((hit / scheduled) * 100) : 0
}

export const TEMPLATES: { group: string; kind: 'build' | 'quit'; items: [string, string][] }[] = [
  {
    group: 'Saúde',
    kind: 'build',
    items: [
      ['💧', 'Beber água'],
      ['🪥', 'Escovar os dentes'],
      ['🌙', 'Dormir cedo'],
      ['☀️', 'Acordar cedo'],
      ['💊', 'Tomar remédio'],
      ['🍎', 'Comer frutas'],
      ['🏃', 'Fazer exercício'],
    ],
  },
  {
    group: 'Vida',
    kind: 'build',
    items: [
      ['📚', 'Estudar'],
      ['🍳', 'Cozinhar'],
      ['🧹', 'Arrumar a casa'],
      ['💸', 'Anotar gastos'],
      ['🧴', 'Cuidar da pele'],
    ],
  },
  {
    group: 'Mente',
    kind: 'build',
    items: [
      ['🧘', 'Meditar'],
      ['📓', 'Escrever no diário'],
      ['📖', 'Ler 10 páginas'],
      ['🙏', 'Agradecer por algo'],
    ],
  },
  {
    group: 'Largar',
    kind: 'quit',
    items: [
      ['🍔', 'Menos besteira'],
      ['🍬', 'Menos açúcar'],
      ['📱', 'Menos celular'],
      ['🚭', 'Não fumar'],
    ],
  },
]
