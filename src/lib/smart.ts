import { getDate, getDay, lastDayOfMonth, subDays } from 'date-fns'
import type { Task } from './types'
import { DEFAULT_PACKS, type PackId } from './suggestions'

// Sugestões inteligentes: combinam o perfil escolhido com o histórico da própria pessoa.
// Tudo roda no aparelho, a partir das tarefas que já estão carregadas.

export type Smart = { text: string; reason: string }

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// "Depois de X, normalmente vem Y" — por perfil
const FOLLOW_UPS: Partial<Record<PackId | 'todos', { match: RegExp; next: string }[]>> = {
  todos: [
    { match: /orcamento/, next: 'Cobrar retorno do orçamento' },
    { match: /reuniao/, next: 'Enviar resumo da reunião' },
  ],
  eletricista: [
    { match: /instal/, next: 'Ligar para o cliente: tudo funcionando?' },
    { match: /ar[- ]condicionado/, next: 'Agendar limpeza do ar-condicionado (6 meses)' },
    { match: /usina|solar|painel|placa/, next: 'Agendar limpeza dos painéis solares' },
    { match: /camera|cftv/, next: 'Enviar acesso das câmeras ao cliente' },
    { match: /visita tecnica/, next: 'Fazer orçamento da visita' },
  ],
  professor: [
    { match: /prova|avaliacao/, next: 'Corrigir provas' },
    { match: /corrigir/, next: 'Lançar notas' },
    { match: /aula/, next: 'Enviar material da aula' },
  ],
  desenvolvedor: [
    { match: /deploy/, next: 'Monitorar erros depois do deploy' },
    { match: /bug/, next: 'Escrever teste para o bug corrigido' },
    { match: /pull request|pr\b/, next: 'Responder comentários do PR' },
  ],
  estudante: [
    { match: /prova/, next: 'Revisar os erros da prova' },
    { match: /trabalho/, next: 'Revisar o trabalho antes de entregar' },
  ],
  autonomo: [
    { match: /venda|vendi|fechar/, next: 'Emitir nota fiscal' },
    { match: /cobrar/, next: 'Conferir se o pagamento caiu' },
  ],
}

// Momento do mês/semana — por perfil
function calendarHints(packs: PackId[], now: Date): Smart[] {
  const out: Smart[] = []
  const dow = getDay(now)
  const dom = getDate(now)
  const daysToEnd = getDate(lastDayOfMonth(now)) - dom
  const fimDoMes = daysToEnd <= 3
  if (dow === 1) out.push({ text: 'Planejar a semana', reason: 'Segunda-feira' })
  if (fimDoMes) out.push({ text: 'Pagar contas do mês', reason: 'Fim do mês' })
  if (packs.includes('eletricista')) {
    if (dow === 1) out.push({ text: 'Organizar visitas da semana', reason: 'Segunda-feira' })
    if (dow === 5) out.push({ text: 'Conferir estoque de material', reason: 'Sexta-feira' })
    if (fimDoMes) out.push({ text: 'Emitir notas fiscais do mês', reason: 'Fim do mês' })
  }
  if (packs.includes('autonomo')) {
    if (fimDoMes) out.push({ text: 'Fechar o caixa do mês', reason: 'Fim do mês' })
    if (dom <= 5) out.push({ text: 'Cobrar clientes em aberto', reason: 'Começo do mês' })
  }
  if (packs.includes('professor') && dow === 0) out.push({ text: 'Preparar aulas da semana', reason: 'Domingo' })
  if (packs.includes('desenvolvedor') && dow === 5) out.push({ text: 'Revisar o que foi entregue na semana', reason: 'Sexta-feira' })
  if (packs.includes('estudante') && dow === 0) out.push({ text: 'Organizar estudos da semana', reason: 'Domingo' })
  return out
}

export function smartSuggestions(tasks: Task[], packsSetting: PackId[] | undefined, now = new Date()): Smart[] {
  const packs = packsSetting ?? DEFAULT_PACKS
  const main = tasks.filter((t) => !t.parent_id)
  const openTitles = new Set(main.filter((t) => !t.is_done).map((t) => norm(t.title)))
  const out: Smart[] = []
  const seen = new Set<string>()
  const push = (s: Smart) => {
    const k = norm(s.text)
    if (seen.has(k) || openTitles.has(k)) return // não sugere o que já está pendente
    seen.add(k)
    out.push(s)
  }

  // 1. Continuações do que foi concluído nos últimos 7 dias
  const since = subDays(now, 7).toISOString()
  const recentDone = main
    .filter((t) => t.is_done && (t.completed_at ?? '') >= since)
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
  const rules = [...(FOLLOW_UPS.todos ?? []), ...packs.flatMap((p) => FOLLOW_UPS[p] ?? [])]
  for (const t of recentDone) {
    const title = norm(t.title)
    for (const r of rules) {
      if (r.match.test(title) && norm(r.next) !== title) {
        const short = t.title.length > 24 ? `${t.title.slice(0, 24)}…` : t.title
        push({ text: r.next, reason: `Depois de “${short}”` })
      }
    }
  }

  // 2. O que a pessoa repete (2+ vezes nos últimos 60 dias), priorizando o mesmo dia da semana
  const since60 = subDays(now, 60).toISOString()
  const counts = new Map<string, { title: string; n: number; sameDay: number }>()
  for (const t of main) {
    if (t.created_at < since60) continue
    const k = norm(t.title)
    const c = counts.get(k) ?? { title: t.title, n: 0, sameDay: 0 }
    c.n++
    if (new Date(t.created_at).getDay() === now.getDay()) c.sameDay++
    counts.set(k, c)
  }
  ;[...counts.values()]
    .filter((c) => c.n >= 2)
    .sort((a, b) => b.sameDay - a.sameDay || b.n - a.n)
    .slice(0, 4)
    .forEach((c) => push({ text: c.title, reason: c.sameDay >= 2 ? 'Você costuma criar neste dia' : `Você criou ${c.n}x` }))

  // 3. Momento do mês/semana
  calendarHints(packs, now).forEach(push)

  return out.slice(0, 6)
}
