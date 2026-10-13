import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Carregando, Sheet, TopBar } from '../components/ui'
import { agora, db, lembrarPaciente, uid } from '../lib/db'
import { useFormulas, usePaciente } from '../lib/hooks'
import type { Ativo, Formula, StatusFormula } from '../lib/types'

const STATUS: Record<StatusFormula, { rotulo: string; cls: string }> = {
  em_uso: { rotulo: 'Em uso', cls: 'badge ok' },
  aguardando: { rotulo: 'Aguardando', cls: 'badge warn' },
  encerrada: { rotulo: 'Encerrada', cls: 'badge' },
}

const FORMAS = ['Cápsula', 'Sachê', 'Pó', 'Líquido', 'Gotas', 'Creme', 'Goma']

const ordemHorario = (h: string) => (/^\d{1,2}:\d{2}/.test(h) ? h.padStart(5, '0') : `99${h}`)

export default function Manipulados() {
  const { pid = '' } = useParams()
  const paciente = usePaciente(pid)
  const formulas = useFormulas(pid)
  const [editando, setEditando] = useState<Formula | null>(null)

  useEffect(() => { if (pid) lembrarPaciente(pid) }, [pid])

  if (paciente === null || formulas === null) return <main className="page"><Carregando /></main>
  if (!paciente) return <main className="page"><TopBar voltar="/" titulo="Manipulados" /><div className="empty">Paciente não encontrado.</div></main>

  const ativas = formulas.filter((f) => f.status !== 'encerrada')
  const rotina = [...ativas].sort((a, b) => ordemHorario(a.horario).localeCompare(ordemHorario(b.horario)))
  const nova = (): Formula => ({ id: uid(), pacienteId: pid, nome: '', forma: 'Cápsula', ativos: [{ nome: '', dose: '' }], posologia: '', horario: '', duracao: '', farmacia: '', status: 'em_uso', criadoEm: agora() })

  return (
    <main className="page">
      <TopBar voltar={`/p/${pid}`} titulo={paciente.nome} />
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 4 }}>
          <h1 className="h1">Manipulados</h1>
          <span className="muted" style={{ fontSize: 13 }}>{ativas.length} {ativas.length === 1 ? 'fórmula ativa' : 'fórmulas ativas'}</span>
        </div>
        <button type="button" className="btn primary pill" onClick={() => setEditando(nova())}><Icon n="mais" size={18} stroke={2.2} />Fórmula</button>
      </div>

      {rotina.length > 0 && (
        <section className="card dark" aria-labelledby="t-rot" style={{ gap: 6 }}>
          <h2 id="t-rot" className="sec">Rotina do dia</h2>
          {rotina.map((f, i) => (
            <div key={f.id} className="row" style={{ gap: 14, padding: '10px 0', borderTop: i ? '1px solid var(--dark-line)' : 0 }}>
              <span className="num" style={{ minWidth: 48, color: 'var(--dark-muted)', fontSize: 13 }}>{f.horario || '—'}</span>
              <span style={{ flex: 1, fontSize: 14 }}>{f.nome}{f.posologia ? ` · ${f.posologia}` : ''}</span>
            </div>
          ))}
        </section>
      )}

      <section className="stack" aria-labelledby="t-form">
        <h2 id="t-form" className="sec">Fórmulas</h2>
        {formulas.length === 0 && (
          <div className="card dashed" style={{ alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 700 }}>Nenhuma fórmula cadastrada</span>
            <span className="muted" style={{ fontSize: 14 }}>Registre os manipulados com ativos, doses, posologia e horário. Eles aparecem no PDF do plano.</span>
            <button type="button" className="btn primary" onClick={() => setEditando(nova())}>Cadastrar fórmula</button>
          </div>
        )}
        {formulas.map((f, i) => (
          <button key={f.id} type="button" className="card" style={{ padding: 16, gap: 12, borderRadius: 20, textAlign: 'left', cursor: 'pointer', font: 'inherit', opacity: f.status === 'encerrada' ? 0.65 : 1 }} onClick={() => setEditando(f)}>
            <div className="between" style={{ alignItems: 'flex-start' }}>
              <div className="stack" style={{ gap: 3 }}>
                <span className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Fórmula {i + 1} · {f.forma}</span>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{f.nome || 'Sem nome'}</span>
              </div>
              <span className={STATUS[f.status].cls}>{STATUS[f.status].rotulo}</span>
            </div>
            {f.ativos.filter((a) => a.nome).length > 0 && (
              <div className="stack" style={{ gap: 6, fontSize: 14 }}>
                {f.ativos.filter((a) => a.nome).map((a, j) => (
                  <div key={j} className="between"><span>{a.nome}</span><span className="num" style={{ fontWeight: 600 }}>{a.dose}</span></div>
                ))}
              </div>
            )}
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {[f.posologia, f.horario, f.duracao, f.farmacia].filter(Boolean).map((x) => <span key={x} className="badge" style={{ fontSize: 12, fontWeight: 600 }}>{x}</span>)}
            </div>
          </button>
        ))}
      </section>

      <span className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>Ativos, doses e posologia conforme prescrição do profissional habilitado. As fórmulas ativas aparecem no PDF do plano.</span>

      {editando && <FormulaSheet inicial={editando} existe={formulas.some((x) => x.id === editando.id)} aoFechar={() => setEditando(null)} />}
    </main>
  )
}

function FormulaSheet({ inicial, existe, aoFechar }: { inicial: Formula; existe: boolean; aoFechar: () => void }) {
  const [f, setF] = useState<Formula>(inicial)
  const set = <K extends keyof Formula>(k: K, v: Formula[K]) => setF({ ...f, [k]: v })
  const setAtivo = (i: number, k: keyof Ativo, v: string) => set('ativos', f.ativos.map((a, j) => (j === i ? { ...a, [k]: v } : a)))

  async function salvar() {
    await db.formulas.put({ ...f, nome: f.nome.trim() || f.ativos.find((a) => a.nome)?.nome || 'Fórmula', ativos: f.ativos.filter((a) => a.nome.trim() || a.dose.trim()) })
    aoFechar()
  }

  return (
    <Sheet titulo={existe ? 'Editar fórmula' : 'Nova fórmula'} aoFechar={aoFechar}>
      <div className="field"><label htmlFor="fm-nome">Nome da fórmula</label><input id="fm-nome" className="input" placeholder="Ex.: Vitamina D3 + K2" value={f.nome} onChange={(e) => set('nome', e.target.value)} /></div>
      <div className="grid2">
        <div className="field"><label htmlFor="fm-forma">Forma</label>
          <select id="fm-forma" className="input" value={f.forma} onChange={(e) => set('forma', e.target.value)}>{FORMAS.map((x) => <option key={x}>{x}</option>)}</select>
        </div>
        <div className="field"><label htmlFor="fm-status">Status</label>
          <select id="fm-status" className="input" value={f.status} onChange={(e) => set('status', e.target.value as StatusFormula)}>
            {(Object.keys(STATUS) as StatusFormula[]).map((k) => <option key={k} value={k}>{STATUS[k].rotulo}</option>)}
          </select>
        </div>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <span className="lbl" style={{ fontSize: 12, fontWeight: 600, color: '#3F4B45' }}>Ativos</span>
        {f.ativos.map((a, i) => (
          <div key={i} className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 3 }}><label className="sr-only" htmlFor={`fm-a${i}`}>Ativo {i + 1}</label><input id={`fm-a${i}`} className="input" placeholder="Ativo" value={a.nome} onChange={(e) => setAtivo(i, 'nome', e.target.value)} /></div>
            <div className="field" style={{ flex: 2 }}><label className="sr-only" htmlFor={`fm-d${i}`}>Dose do ativo {i + 1}</label><input id={`fm-d${i}`} className="input" placeholder="Dose" value={a.dose} onChange={(e) => setAtivo(i, 'dose', e.target.value)} /></div>
            {f.ativos.length > 1 && <button type="button" className="icon-btn" aria-label={`Remover ativo ${i + 1}`} onClick={() => set('ativos', f.ativos.filter((_, j) => j !== i))}><Icon n="lixo" size={18} /></button>}
          </div>
        ))}
        <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => set('ativos', [...f.ativos, { nome: '', dose: '' }])}>+ Adicionar ativo</button>
      </div>

      <div className="grid2">
        <div className="field"><label htmlFor="fm-pos">Posologia</label><input id="fm-pos" className="input" placeholder="1 cáps. ao dia" value={f.posologia} onChange={(e) => set('posologia', e.target.value)} /></div>
        <div className="field"><label htmlFor="fm-hor">Horário / refeição</label><input id="fm-hor" className="input" placeholder="12:30 ou Almoço" value={f.horario} onChange={(e) => set('horario', e.target.value)} /></div>
        <div className="field"><label htmlFor="fm-dur">Duração</label><input id="fm-dur" className="input" placeholder="60 dias" value={f.duracao} onChange={(e) => set('duracao', e.target.value)} /></div>
        <div className="field"><label htmlFor="fm-farm">Farmácia</label><input id="fm-farm" className="input" placeholder="Opcional" value={f.farmacia} onChange={(e) => set('farmacia', e.target.value)} /></div>
      </div>
      <button type="button" className="btn primary" onClick={salvar}>Salvar fórmula</button>
      {existe && <button type="button" className="btn danger" onClick={async () => { if (window.confirm('Excluir esta fórmula?')) { await db.formulas.delete(f.id); aoFechar() } }}>Excluir</button>}
    </Sheet>
  )
}
