import type { Nutrientes } from './types'

/** Produto vindo do Open Food Facts, com valores convertidos para 100 g. */
export type ProdutoOFF = {
  codigo: string
  nome: string
  marca: string
  porcao: string
  porcaoG: number | null
  por100: Nutrientes
}

const BASE = 'https://world.openfoodfacts.org'

type Nutriments = Record<string, number | string | undefined>
type Raw = {
  code?: string
  product_name?: string
  product_name_pt?: string
  generic_name?: string
  brands?: string
  serving_size?: string
  serving_quantity?: number | string
  nutriments?: Nutriments
}

const num = (x: unknown) => {
  const n = typeof x === 'string' ? Number(x.replace(',', '.')) : typeof x === 'number' ? x : NaN
  return isFinite(n) ? n : null
}

function converter(r: Raw): ProdutoOFF | null {
  const n = r.nutriments ?? {}
  let kcal = num(n['energy-kcal_100g'])
  const kj = num(n['energy-kj_100g'] ?? n['energy_100g'])
  if (kcal == null && kj != null) kcal = kj / 4.184
  const sodioG = num(n['sodium_100g'])
  const por100: Nutrientes = {
    kcal: kcal == null ? null : Math.round(kcal * 10) / 10,
    p: num(n['proteins_100g']),
    c: num(n['carbohydrates_100g']),
    g: num(n['fat_100g']),
    fibra: num(n['fiber_100g']),
    sodio: sodioG == null ? null : Math.round(sodioG * 1000),
  }
  const nome = (r.product_name_pt || r.product_name || r.generic_name || '').trim()
  if (!nome || (por100.kcal == null && por100.p == null)) return null
  return {
    codigo: r.code ?? '',
    nome,
    marca: (r.brands ?? '').split(',')[0].trim(),
    porcao: r.serving_size ?? '',
    porcaoG: num(r.serving_quantity),
    por100,
  }
}

const CAMPOS = 'code,product_name,product_name_pt,generic_name,brands,serving_size,serving_quantity,nutriments'

export async function buscarOFF(termo: string, sinal?: AbortSignal): Promise<ProdutoOFF[]> {
  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(termo)}&search_simple=1&action=process&json=1&page_size=24&fields=${CAMPOS}&lc=pt&cc=br`
  const r = await fetch(url, { signal: sinal })
  if (!r.ok) throw new Error(`Open Food Facts respondeu ${r.status}`)
  const j = (await r.json()) as { products?: Raw[] }
  return (j.products ?? []).map(converter).filter((x): x is ProdutoOFF => x !== null)
}

export async function buscarCodigoOFF(codigo: string, sinal?: AbortSignal): Promise<ProdutoOFF | null> {
  const limpo = codigo.replace(/\D/g, '')
  if (!limpo) return null
  const r = await fetch(`${BASE}/api/v2/product/${limpo}.json?fields=${CAMPOS}`, { signal: sinal })
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`Open Food Facts respondeu ${r.status}`)
  const j = (await r.json()) as { status?: number; product?: Raw }
  if (!j.product || j.status === 0) return null
  return converter({ ...j.product, code: j.product.code ?? limpo })
}
