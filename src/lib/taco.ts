import dados from '../data/taco.json'
import type { Alimento } from './types'

type Linha = [string, number | null, number | null, number | null, number | null, number | null, number | null]

export const FONTE_TACO = dados.fonte

/** Categorias na ordem da tabela, com o intervalo de ids de cada uma. */
export const CATEGORIAS_TACO = (dados.categorias as [string, number, number][]).map(([nome, de, ate]) => ({ nome, de, ate }))

function categoriaDe(id: number) {
  return CATEGORIAS_TACO.find((c) => id >= c.de && id <= c.ate)?.nome ?? 'Outros'
}

/** Os 597 alimentos da TACO, valores por 100 g. */
export const TACO: Alimento[] = (dados.alimentos as Linha[]).map(([nome, kcal, p, c, g, fibra, sodio], i) => {
  const id = i + 1
  return {
    ref: `taco:${id}`,
    nome: nome.trim(),
    categoria: categoriaDe(id),
    fonte: 'taco',
    por100: { kcal, p, c, g, fibra, sodio },
  }
})

export const idTaco = (ref: string) => (ref.startsWith('taco:') ? Number(ref.slice(5)) : null)

/** Rótulos curtos para os filtros da busca. */
export const FILTROS = [
  { rotulo: 'Todos', cats: null },
  { rotulo: 'Minha base', cats: ['__propria'] },
  { rotulo: 'Carnes', cats: ['Carnes e derivados'] },
  { rotulo: 'Peixes', cats: ['Pescados e frutos do mar'] },
  { rotulo: 'Cereais', cats: ['Cereais e derivados'] },
  { rotulo: 'Verduras', cats: ['Verduras, hortaliças e derivados'] },
  { rotulo: 'Frutas', cats: ['Frutas e derivados'] },
  { rotulo: 'Leguminosas', cats: ['Leguminosas e derivados'] },
  { rotulo: 'Ovos e leite', cats: ['Ovos e derivados', 'Leite e derivados'] },
  { rotulo: 'Oleaginosas', cats: ['Nozes e sementes'] },
  { rotulo: 'Óleos', cats: ['Gorduras e óleos'] },
  { rotulo: 'Preparados', cats: ['Alimentos preparados'] },
  { rotulo: 'Outros', cats: ['Bebidas (alcoólicas e não alcoólicas)', 'Produtos açucarados', 'Miscelâneas', 'Outros alimentos industrializados'] },
] as const
