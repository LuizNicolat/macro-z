import Dexie, { type EntityTable } from 'dexie'
import type { AlimentoProprio, Avaliacao, Diario, Formula, Paciente, Plano, Refeicao } from './types'

/** Banco local do navegador (IndexedDB). Nada sai do aparelho. */
class MacroZDB extends Dexie {
  pacientes!: EntityTable<Paciente, 'id'>
  planos!: EntityTable<Plano, 'pacienteId'>
  avaliacoes!: EntityTable<Avaliacao, 'id'>
  formulas!: EntityTable<Formula, 'id'>
  alimentos!: EntityTable<AlimentoProprio, 'id'>
  diario!: EntityTable<Diario, 'id'>

  constructor() {
    super('macro-z')
    this.version(1).stores({
      pacientes: 'id, nome, atualizadoEm',
      planos: 'pacienteId',
      avaliacoes: 'id, pacienteId, data',
      formulas: 'id, pacienteId',
      alimentos: 'id, nome, codigoBarras',
    })
    // v2: diário do paciente (refeições e suplementos marcados por dia).
    this.version(2).stores({ diario: 'id, pacienteId, data' })
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
  await db.transaction('rw', [db.pacientes, db.planos, db.avaliacoes, db.formulas, db.diario], async () => {
    await db.pacientes.delete(id)
    await db.planos.delete(id)
    await db.avaliacoes.where('pacienteId').equals(id).delete()
    await db.formulas.where('pacienteId').equals(id).delete()
    await db.diario.where('pacienteId').equals(id).delete()
  })
  const m = modoApp()
  if (m.tipo === 'paciente' && m.pid === id) definirModo({ tipo: 'profissional' })
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

/* ---------- Modo do aparelho: profissional ou paciente ---------- */

export type Modo = { tipo: 'profissional' } | { tipo: 'paciente'; pid: string }
const CHAVE_MODO = 'macroz:modo'

export function modoApp(): Modo {
  try {
    const m = JSON.parse(localStorage.getItem(CHAVE_MODO) ?? 'null') as Modo | null
    if (m && m.tipo === 'paciente' && typeof m.pid === 'string') return m
  } catch { /* armazenamento indisponível */ }
  return { tipo: 'profissional' }
}

export function definirModo(m: Modo) {
  try { localStorage.setItem(CHAVE_MODO, JSON.stringify(m)) } catch { /* armazenamento indisponível */ }
}

/* ---------- Diário do paciente ---------- */

export const idDiario = (pid: string, data: string) => `${pid}:${data}`

export async function alterarDiario(pid: string, data: string, fn: (d: Diario) => void) {
  await db.transaction('rw', db.diario, async () => {
    const id = idDiario(pid, data)
    const d = (await db.diario.get(id)) ?? { id, pacienteId: pid, data, refeicoes: {}, formulas: [] }
    fn(d)
    await db.diario.put(d)
  })
}

/* ---------- Backup ---------- */

type Backup = {
  app: 'macro-z'
  versao: number
  exportadoEm: string
  /** Presente no arquivo enviado ao paciente: o app abre direto na visão dele. */
  abrirComo?: string
  pacientes: Paciente[]
  planos: Plano[]
  avaliacoes: Avaliacao[]
  formulas: Formula[]
  alimentos: AlimentoProprio[]
  diario?: Diario[]
}

export async function exportarBackup(): Promise<Backup> {
  const [pacientes, planos, avaliacoes, formulas, alimentos, diario] = await Promise.all([
    db.pacientes.toArray(), db.planos.toArray(), db.avaliacoes.toArray(), db.formulas.toArray(), db.alimentos.toArray(), db.diario.toArray(),
  ])
  return { app: 'macro-z', versao: 2, exportadoEm: agora(), pacientes, planos, avaliacoes, formulas, alimentos, diario }
}

/** Arquivo com um só paciente, para ele importar no próprio celular e ver a dieta. */
export async function exportarPaciente(pid: string): Promise<Backup> {
  const [paciente, plano, avaliacoes, formulas] = await Promise.all([
    db.pacientes.get(pid), db.planos.get(pid), db.avaliacoes.where('pacienteId').equals(pid).toArray(), db.formulas.where('pacienteId').equals(pid).toArray(),
  ])
  if (!paciente || !plano) throw new Error('Paciente não encontrado.')
  const refs = new Set<string>()
  for (const r of plano.refeicoes) {
    for (const it of [...r.itens, ...(r.opcoes ?? []).flatMap((o) => o.itens)]) {
      refs.add(it.ref)
      it.alternativas?.forEach((a) => a.ref && refs.add(a.ref))
    }
  }
  const ids = [...refs].filter((r) => r.startsWith('propria:')).map((r) => r.slice(8))
  const alimentos = (await db.alimentos.bulkGet(ids)).filter((a): a is AlimentoProprio => !!a)
  return { app: 'macro-z', versao: 2, exportadoEm: agora(), abrirComo: pid, pacientes: [paciente], planos: [plano], avaliacoes, formulas, alimentos }
}

/** Importa e devolve o id do paciente a abrir na visão de usuário, se o arquivo pedir. */
export async function importarBackup(json: unknown): Promise<string | null> {
  const d = json as Backup
  if (!d || d.app !== 'macro-z') throw new Error('Arquivo não é um backup do Macro Z.')
  await db.transaction('rw', [db.pacientes, db.planos, db.avaliacoes, db.formulas, db.alimentos, db.diario], async () => {
    await db.pacientes.bulkPut(d.pacientes ?? [])
    await db.planos.bulkPut(d.planos ?? [])
    await db.avaliacoes.bulkPut(d.avaliacoes ?? [])
    await db.formulas.bulkPut(d.formulas ?? [])
    await db.alimentos.bulkPut(d.alimentos ?? [])
    await db.diario.bulkPut(d.diario ?? [])
  })
  if (d.abrirComo && d.pacientes?.some((p) => p.id === d.abrirComo)) {
    definirModo({ tipo: 'paciente', pid: d.abrirComo })
    return d.abrirComo
  }
  return null
}

export function baixarJson(dados: unknown, nomeArquivo: string) {
  const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  a.click()
  URL.revokeObjectURL(url)
}

export const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
