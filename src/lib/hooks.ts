import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from './db'
import { TACO } from './taco'
import type { Alimento, AlimentoProprio } from './types'

export const usePaciente = (id?: string) => useLiveQuery(() => (id ? db.pacientes.get(id) : undefined), [id], null)
export const usePlano = (id?: string) => useLiveQuery(() => (id ? db.planos.get(id) : undefined), [id], null)

export const useAvaliacoes = (pid?: string) =>
  useLiveQuery(async () => (pid ? (await db.avaliacoes.where('pacienteId').equals(pid).sortBy('data')).reverse() : []), [pid], null)

export const useFormulas = (pid?: string) =>
  useLiveQuery(async () => (pid ? (await db.formulas.where('pacienteId').equals(pid).sortBy('criadoEm')) : []), [pid], null)

export const proprioParaAlimento = (a: AlimentoProprio): Alimento => ({
  ref: `propria:${a.id}`,
  nome: a.nome,
  marca: a.marca,
  categoria: '__propria',
  fonte: 'propria',
  por100: a.por100,
  medida: a.medida,
  porcaoG: a.porcaoG,
})

/** TACO + alimentos cadastrados pelo profissional. */
export function useAlimentos() {
  const proprios = useLiveQuery(() => db.alimentos.toArray(), [], [] as AlimentoProprio[])
  return useMemo(() => [...proprios.map(proprioParaAlimento), ...TACO], [proprios])
}
