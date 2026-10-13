import Dexie, { type EntityTable } from 'dexie'
import type { AlimentoProprio, Avaliacao, Formula, Paciente, Plano, Refeicao } from './types'

/** Banco local do navegador (IndexedDB). Nada sai do aparelho. */
class MacroZDB extends Dexie {
  pacientes!: EntityTable<Paciente, 'id'>
  planos!: EntityTable<Plano, 'pacienteId'>
  avaliacoes!: EntityTable<Avaliacao, 'id'>
  formulas!: EntityTable<Formula, 'id'>
  alimentos!: EntityTable<AlimentoProprio, 'id'>

  constructor() {
    super('macro-z')
    this.version(1).stores({
      pacientes: 'id, nome, atualizadoEm',
      planos: 'pacienteId',
      avaliacoes: 'id, pacienteId, data',
      formulas: 'id, pacienteId',
      alimentos: 'id, nome, codigoBarras',
    })
  }
}

export const db = new MacroZDB()

export function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

export const agora = () => new Date().toISOString()
export const hojeISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const REFEICOES_PADRAO: [string, string][] = [
  ['Café da manhã', '07:00'],
  ['Almoço', '12:30'],
  ['Lanche da tarde', '16:00'],
  ['Jantar', '19:30'],
  ['Ceia', '22:00'],
]

export function planoVazio(pacienteId: string): Plano {
  return {
    pacienteId,
    refeicoes: REFEICOES_PADRAO.map(([nome, horario]): Refeicao => ({ id: uid(), nome, horario, itens: [] })),
    meta: { kcal: 0, p: 0, c: 0, g: 0, fibra: 25 },
    observacoes: '',
    obsVisivel: true,
    versao: 1,
    atualizadoEm: agora(),
  }
}

export async function criarPaciente(dados: Omit<Paciente, 'id' | 'criadoEm' | 'atualizadoEm'>) {
  const id = uid()
  const t = agora()
  await db.transaction('rw', db.pacientes, db.planos, async () => {
    await db.pacientes.add({ ...dados, id, criadoEm: t, atualizadoEm: t })
    await db.planos.add(planoVazio(id))
  })
  return id
}

export async function excluirPaciente(id: string) {
  await db.transaction('rw', [db.pacientes, db.planos, db.avaliacoes, db.formulas], async () => {
    await db.pacientes.delete(id)
    await db.planos.delete(id)
    await db.avaliacoes.where('pacienteId').equals(id).delete()
    await db.formulas.where('pacienteId').equals(id).delete()
  })
}

/** Lê o plano (criando um vazio se faltar), aplica a alteração e grava. */
export async function alterarPlano(pacienteId: string, fn: (p: Plano) => void) {
  await db.transaction('rw', db.planos, db.pacientes, async () => {
    const p = (await db.planos.get(pacienteId)) ?? planoVazio(pacienteId)
    fn(p)
    p.atualizadoEm = agora()
    await db.planos.put(p)
    await db.pacientes.update(pacienteId, { atualizadoEm: p.atualizadoEm })
  })
}

/* ---------- Último paciente aberto (para a barra inferior) ---------- */

const CHAVE_ULTIMO = 'macroz:ultimoPaciente'
export function lembrarPaciente(id: string) {
  try { localStorage.setItem(CHAVE_ULTIMO, id) } catch { /* armazenamento indisponível */ }
}
export function ultimoPaciente() {
  try { return localStorage.getItem(CHAVE_ULTIMO) } catch { return null }
}

/* ---------- Backup ---------- */

export async function exportarBackup() {
  const [pacientes, planos, avaliacoes, formulas, alimentos] = await Promise.all([
    db.pacientes.toArray(), db.planos.toArray(), db.avaliacoes.toArray(), db.formulas.toArray(), db.alimentos.toArray(),
  ])
  return { app: 'macro-z', versao: 1, exportadoEm: agora(), pacientes, planos, avaliacoes, formulas, alimentos }
}

export async function importarBackup(json: unknown) {
  const d = json as Awaited<ReturnType<typeof exportarBackup>>
  if (!d || d.app !== 'macro-z') throw new Error('Arquivo não é um backup do Macro Z.')
  await db.transaction('rw', [db.pacientes, db.planos, db.avaliacoes, db.formulas, db.alimentos], async () => {
    await db.pacientes.bulkPut(d.pacientes ?? [])
    await db.planos.bulkPut(d.planos ?? [])
    await db.avaliacoes.bulkPut(d.avaliacoes ?? [])
    await db.formulas.bulkPut(d.formulas ?? [])
    await db.alimentos.bulkPut(d.alimentos ?? [])
  })
}
