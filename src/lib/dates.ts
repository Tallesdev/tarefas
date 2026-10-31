import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  isBefore,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  startOfDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Repeat, Task } from './types'

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd')
export const todayISO = () => toISODate(new Date())

export function dueLabel(task: Pick<Task, 'due_date' | 'due_time'>): string | null {
  if (!task.due_date) return null
  const d = parseISO(task.due_date)
  let label: string
  if (isToday(d)) label = 'Hoje'
  else if (isTomorrow(d)) label = 'Amanhã'
  else if (isYesterday(d)) label = 'Ontem'
  else label = format(d, "d 'de' MMM", { locale: ptBR })
  if (task.due_time) label += ` · ${task.due_time.slice(0, 5)}`
  return label
}

export function isOverdue(task: Pick<Task, 'due_date' | 'is_done'>): boolean {
  if (!task.due_date || task.is_done) return false
  return isBefore(parseISO(task.due_date), startOfDay(new Date()))
}

export type Group = 'atrasadas' | 'hoje' | 'futuras' | 'sem-data' | 'concluidas'

export function groupOf(task: Task): Group {
  if (task.is_done) return 'concluidas'
  if (!task.due_date) return 'sem-data'
  const d = parseISO(task.due_date)
  if (isBefore(d, startOfDay(new Date()))) return 'atrasadas'
  if (isToday(d)) return 'hoje'
  return 'futuras'
}

export const groupTitles: Record<Group, string> = {
  atrasadas: 'Atrasadas',
  hoje: 'Hoje',
  futuras: 'Próximas',
  'sem-data': 'Sem data',
  concluidas: 'Concluídas',
}

// ---------- repetição (guardada como RRULE simples) ----------
const RULES: Record<Exclude<Repeat, 'none'>, string> = {
  daily: 'FREQ=DAILY',
  weekly: 'FREQ=WEEKLY',
  monthly: 'FREQ=MONTHLY',
  yearly: 'FREQ=YEARLY',
}

export const repeatLabels: Record<Repeat, string> = {
  none: 'Não repetir',
  daily: 'Todo dia',
  weekly: 'Toda semana',
  monthly: 'Todo mês',
  yearly: 'Todo ano',
}

export const repeatToRule = (r: Repeat) => (r === 'none' ? null : RULES[r])

export function ruleToRepeat(rule: string | null): Repeat {
  if (!rule) return 'none'
  const found = (Object.keys(RULES) as Exclude<Repeat, 'none'>[]).find((k) => rule.startsWith(RULES[k]))
  return found ?? 'none'
}

export function nextDueDate(due: string, rule: string): string {
  const d = parseISO(due)
  switch (ruleToRepeat(rule)) {
    case 'daily':
      return toISODate(addDays(d, 1))
    case 'weekly':
      return toISODate(addWeeks(d, 1))
    case 'monthly':
      return toISODate(addMonths(d, 1))
    case 'yearly':
      return toISODate(addYears(d, 1))
    default:
      return due
  }
}

// ---------- entrada inteligente: "Dentista na próxima terça às 15h" ----------
const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  'segunda-feira': 1,
  terca: 2,
  'terca-feira': 2,
  quarta: 3,
  'quarta-feira': 3,
  quinta: 4,
  'quinta-feira': 4,
  sexta: 5,
  'sexta-feira': 5,
  sabado: 6,
}

const strip = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export type Parsed = { title: string; due_date: string | null; due_time: string | null }

export function parseSmart(input: string, now = new Date()): Parsed {
  let text = input
  let due: Date | null = null
  let time: string | null = null

  const cut = (match: RegExpMatchArray) => {
    text = (text.slice(0, match.index) + text.slice((match.index ?? 0) + match[0].length)).replace(/\s{2,}/g, ' ')
  }

  // horário: "às 18h", "as 18:30", "18h30"
  const timeRe = /\b(?:[àa]s\s+)?(\d{1,2})(?:h|:)(\d{2})?h?\b/i
  const tm = strip(text).match(timeRe)
  if (tm) {
    const h = Number(tm[1])
    const m = Number(tm[2] ?? 0)
    if (h < 24 && m < 60) {
      time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
      cut(tm)
    }
  }

  const s = strip(text)
  let m: RegExpMatchArray | null
  if ((m = s.match(/\bdepois de amanha\b/))) {
    due = addDays(now, 2)
    cut(m)
  } else if ((m = s.match(/\bamanha\b/))) {
    due = addDays(now, 1)
    cut(m)
  } else if ((m = s.match(/\bhoje\b/))) {
    due = now
    cut(m)
  } else if ((m = s.match(/\b(?:(?:na|no)\s+)?(?:(?:proxim[oa])\s+)?(domingo|segunda(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sabado)\b/))) {
    const target = WEEKDAYS[m[1]]
    let diff = (target - now.getDay() + 7) % 7
    if (diff === 0) diff = 7
    due = addDays(now, diff)
    cut(m)
  } else if ((m = s.match(/\bdia\s+(\d{1,2})\b/))) {
    const day = Number(m[1])
    if (day >= 1 && day <= 31) {
      let d = new Date(now.getFullYear(), now.getMonth(), day)
      if (isBefore(d, startOfDay(now))) d = addMonths(d, 1)
      due = d
      cut(m)
    }
  }

  if (time && !due) due = now
  return { title: text.trim().replace(/\s+(e|de|para)$/i, ''), due_date: due ? toISODate(due) : null, due_time: time }
}
