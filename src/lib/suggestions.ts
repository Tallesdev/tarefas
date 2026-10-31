// Pacotes de sugestões por perfil/profissão. O usuário escolhe um ou mais
// e ainda pode adicionar as próprias ou esconder as que não usa.
export type PackId = 'geral' | 'eletricista' | 'professor' | 'desenvolvedor' | 'estudante' | 'autonomo'

export const PACKS: { id: PackId; name: string; items: string[] }[] = [
  {
    id: 'geral',
    name: 'Dia a dia',
    items: ['Beber água', 'Ir ao mercado', 'Pagar contas', 'Academia hoje às 18h', 'Ligar para a família', 'Lavar roupa'],
  },
  {
    id: 'eletricista',
    name: 'Eletricista',
    items: [
      'Visita técnica amanhã às 9h',
      'Fazer orçamento de instalação',
      'Comprar material elétrico',
      'Instalar ar-condicionado',
      'Manutenção de câmeras',
      'Revisão de usina solar',
      'Trocar disjuntor',
      'Emitir nota fiscal',
    ],
  },
  {
    id: 'professor',
    name: 'Professor',
    items: ['Preparar aula', 'Aula online hoje às 19h', 'Corrigir provas', 'Lançar notas', 'Enviar material aos alunos', 'Planejar a semana'],
  },
  {
    id: 'desenvolvedor',
    name: 'Desenvolvedor',
    items: ['Daily amanhã às 9h', 'Revisar pull request', 'Corrigir bug', 'Fazer deploy', 'Responder cliente', 'Atualizar documentação'],
  },
  {
    id: 'estudante',
    name: 'Estudante',
    items: ['Estudar para a prova', 'Entregar trabalho', 'Revisar a matéria', 'Ler capítulo', 'Reunião do grupo'],
  },
  {
    id: 'autonomo',
    name: 'Autônomo / vendas',
    items: ['Responder orçamentos', 'Cobrar cliente', 'Postar nas redes', 'Emitir nota fiscal', 'Organizar a agenda', 'Fechar o caixa'],
  },
]

export type Settings = {
  theme?: import('./theme').ThemeMode
  accent?: import('./theme').Accent
  timezone?: string
  focusMinutes?: number
  breakMinutes?: number
  packs?: PackId[]
  customSuggestions?: string[]
  hiddenSuggestions?: string[]
}

export const DEFAULT_PACKS: PackId[] = ['geral']

export function visibleSuggestions(s: Settings): string[] {
  const packs = s.packs ?? DEFAULT_PACKS
  const hidden = new Set(s.hiddenSuggestions ?? [])
  const fromPacks = PACKS.filter((p) => packs.includes(p.id)).flatMap((p) => p.items)
  const all = [...(s.customSuggestions ?? []), ...fromPacks]
  return [...new Set(all)].filter((x) => !hidden.has(x))
}

// Agrupado para o painel da prancheta: "Suas" primeiro, depois cada perfil escolhido
export function groupedSuggestions(s: Settings): { title: string; items: string[] }[] {
  const packs = s.packs ?? DEFAULT_PACKS
  const hidden = new Set(s.hiddenSuggestions ?? [])
  const groups = [{ title: 'Suas', items: (s.customSuggestions ?? []).filter((x) => !hidden.has(x)) }]
  for (const p of PACKS) if (packs.includes(p.id)) groups.push({ title: p.name, items: p.items.filter((x) => !hidden.has(x)) })
  return groups.filter((g) => g.items.length > 0)
}
