import type { Alimento, Item, Meta, Nutrientes, Plano, Refeicao, Sexo, Totais } from './types'

export const ZERO: Totais = { kcal: 0, p: 0, c: 0, g: 0, fibra: 0, sodio: 0 }

const v = (x: number | null | undefined) => (typeof x === 'number' && isFinite(x) ? x : 0)

/** Nutrientes de `gramas` de um alimento, a partir dos valores por 100 g. */
export function paraGramas(por100: Nutrientes, gramas: number): Totais {
  const k = Math.max(0, gramas) / 100
  return {
    kcal: v(por100.kcal) * k,
    p: v(por100.p) * k,
    c: v(por100.c) * k,
    g: v(por100.g) * k,
    fibra: v(por100.fibra) * k,
    sodio: v(por100.sodio) * k,
  }
}

export function somar(lista: Totais[]): Totais {
  return lista.reduce(
    (a, t) => ({ kcal: a.kcal + t.kcal, p: a.p + t.p, c: a.c + t.c, g: a.g + t.g, fibra: a.fibra + t.fibra, sodio: a.sodio + t.sodio }),
    { ...ZERO },
  )
}

export const totaisItens = (itens: Item[]) => somar(itens.map((i) => paraGramas(i.por100, i.gramas)))
/** Totais da opção 1 (a principal) da refeição. */
export const totaisRefeicao = (r: Refeicao) => totaisItens(r.itens)

/** Todas as versões da refeição: a principal ("Opção 1") seguida das alternativas. */
export function opcoesDe(r: Refeicao): { nome: string; itens: Item[] }[] {
  const extras = r.opcoes ?? []
  if (!extras.length) return [{ nome: 'Opção 1', itens: r.itens }]
  return [{ nome: 'Opção 1', itens: r.itens }, ...extras.map((o, i) => ({ nome: o.nome || `Opção ${i + 2}`, itens: o.itens }))]
}

/** Itens da opção `op` (0 = principal). Devolve a própria lista, para editar dentro de alterarPlano. */
export function itensOpcao(r: Refeicao, op: number): Item[] {
  return op === 0 ? r.itens : (r.opcoes?.[op - 1]?.itens ?? [])
}

export function definirItensOpcao(r: Refeicao, op: number, itens: Item[]) {
  if (op === 0) r.itens = itens
  else if (r.opcoes?.[op - 1]) r.opcoes[op - 1].itens = itens
}

/** Texto curto da quantidade: "50 g (2 fatias)" ou só "2 fatias" quando não há gramas. */
export function quantidade(gramas: number | null | undefined, medida?: string) {
  const g = gramas ? `${fa(gramas)} g` : ''
  if (g && medida) return `${g} (${medida})`
  return g || medida || ''
}
export const totaisPlano = (p: Plano) => somar(p.refeicoes.map(totaisRefeicao))

/** Energia estimada pelos fatores de Atwater (4/4/9). */
export const kcalPorMacros = (p: number, c: number, g: number) => p * 4 + c * 4 + g * 9

/** Participação de cada macro nas calorias vindas de macros (0–1). */
export function distribuicao(t: Totais) {
  const pk = t.p * 4, ck = t.c * 4, gk = t.g * 9
  const soma = pk + ck + gk
  if (!soma) return { p: 0, c: 0, g: 0 }
  return { p: pk / soma, c: ck / soma, g: gk / soma }
}

/** Indica se um alimento não tem nenhum valor de energia ou macro analisado. */
export const semDados = (n: Nutrientes) => n.kcal == null && n.p == null && n.c == null && n.g == null

export const imc = (pesoKg: number, alturaCm: number) => {
  const m = alturaCm / 100
  return m > 0 ? pesoKg / (m * m) : 0
}

export function classificarImc(x: number) {
  if (!x) return ''
  if (x < 18.5) return 'Abaixo do peso'
  if (x < 25) return 'Eutrofia'
  if (x < 30) return 'Sobrepeso'
  return 'Obesidade'
}

/** Taxa metabólica basal (Mifflin-St Jeor), kcal/dia. */
export function tmbMifflin(sexo: Sexo, pesoKg: number, alturaCm: number, idade: number) {
  return 10 * pesoKg + 6.25 * alturaCm - 5 * idade + (sexo === 'F' ? -161 : 5)
}

export const NIVEIS_ATIVIDADE = [
  { valor: 1.2, rotulo: 'Sedentário (×1,2)' },
  { valor: 1.375, rotulo: 'Leve, 1–3 treinos/sem (×1,375)' },
  { valor: 1.55, rotulo: 'Moderado, 3–5 treinos/sem (×1,55)' },
  { valor: 1.725, rotulo: 'Intenso, 6–7 treinos/sem (×1,725)' },
  { valor: 1.9, rotulo: 'Muito intenso, 2x/dia (×1,9)' },
]

/**
 * Metas do plano: kcal = gasto total − déficit; proteína e gordura em g/kg;
 * carboidrato fica com as calorias restantes.
 */
export function calcularMetas(a: { sexo: Sexo; pesoKg: number; alturaCm: number; idade: number; atividade: number; deficit: number; protKg: number; gordKg: number }): Meta & { tmb: number; get: number } {
  const tmb = tmbMifflin(a.sexo, a.pesoKg, a.alturaCm, a.idade)
  const get = tmb * a.atividade
  const kcal = Math.max(0, get - a.deficit)
  const p = a.pesoKg * a.protKg
  const g = a.pesoKg * a.gordKg
  const c = Math.max(0, (kcal - p * 4 - g * 9) / 4)
  return { tmb, get, kcal, p, c, g, fibra: a.sexo === 'F' ? 25 : 30 }
}

export type BaseTroca = 'c' | 'p' | 'g' | 'kcal'

/** Gramas do alimento destino que igualam o nutriente `base` de `gramas` do alimento origem. */
export function equivalente(gramas: number, origem: Nutrientes, destino: Nutrientes, base: BaseTroca) {
  const a = v(origem[base]), b = v(destino[base])
  if (!a || !b) return null
  return (gramas * a) / b
}

export const equivalenteCarbo = (gramas: number, origem: Nutrientes, destino: Nutrientes) => equivalente(gramas, origem, destino, 'c')

/** Macro que mais contribui com calorias no alimento — base natural para uma troca. */
export function macroPrincipal(n: Nutrientes): BaseTroca {
  const pk = v(n.p) * 4, ck = v(n.c) * 4, gk = v(n.g) * 9
  if (!pk && !ck && !gk) return 'kcal'
  if (ck >= pk && ck >= gk) return 'c'
  return pk >= gk ? 'p' : 'g'
}

export function idadeEm(nascimento: string, hoje = new Date()) {
  if (!nascimento) return null
  const n = new Date(nascimento + 'T00:00:00')
  if (isNaN(n.getTime())) return null
  let idade = hoje.getFullYear() - n.getFullYear()
  const m = hoje.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < n.getDate())) idade--
  return idade
}

/* ---------- Busca ---------- */

export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/**
 * Filtra alimentos por todas as palavras digitadas (sem acento, qualquer ordem)
 * e ordena: nome que começa com a busca primeiro, depois nomes mais curtos.
 */
export function buscarAlimentos<T extends Alimento>(lista: T[], q: string, limite = 80): T[] {
  const termos = normalizar(q).split(/[\s,]+/).filter(Boolean)
  if (!termos.length) return []
  const res: { a: T; score: number }[] = []
  for (const a of lista) {
    const n = normalizar(a.nome + ' ' + (a.marca ?? ''))
    if (!termos.every((t) => n.includes(t))) continue
    let score = n.length
    if (n.startsWith(termos[0])) score -= 1000
    if (a.fonte === 'propria') score -= 500
    res.push({ a, score })
  }
  return res.sort((x, y) => x.score - y.score).slice(0, limite).map((r) => r.a)
}

/* ---------- Números em pt-BR ---------- */

const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const nfa = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** 1 casa decimal fixa: 57,5 */
export const f1 = (x: number) => nf1.format(x)
/** Inteiro com milhar: 1.761 */
export const f0 = (x: number) => nf0.format(Math.round(x))
/** Até 1 casa, sem zeros à toa: 24 / 1,5 */
export const fa = (x: number | null | undefined) => (x == null ? '—' : nfa.format(x))

/** Aceita "68,4", "68.4" ou vazio. Retorna null se não for número. */
export function lerNumero(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(',', '.')
  if (!t) return null
  const x = Number(t)
  return isFinite(x) ? x : null
}

export const numParaCampo = (x: number | null | undefined) => (x == null ? '' : String(x).replace('.', ','))

export const pct = (x: number) => `${Math.round(x * 100)}%`
