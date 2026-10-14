import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Carregando } from '../../components/ui'
import { alterarDiario, db, hojeISO, idDiario, lembrarPaciente } from '../../lib/db'
import { diaCurto, horaAgora, minutos, somarDias } from '../../lib/datas'
import { usePaciente, usePlano } from '../../lib/hooks'
import { f0, f1, opcoesDe, quantidade, somar, totaisItens } from '../../lib/nutri'
import type { Item, Refeicao } from '../../lib/types'

/** Visão do paciente: as refeições do dia, com opções e substituições, para marcar como feitas. */
export default function Hoje() {
  const { pid = '' } = useParams()
  const paciente = usePaciente(pid)
  const plano = usePlano(pid)
  const [data, setData] = useState(hojeISO())
  const diario = useLiveQuery(() => db.diario.get(idDiario(pid, data)), [pid, data], null)
  const formulas = useLiveQuery(() => db.formulas.where('pacienteId').equals(pid).filter((f) => f.status !== 'encerrada').count(), [pid], 0)

  useEffect(() => { if (pid) lembrarPaciente(pid) }, [pid])

  if (paciente === null || plano === null || diario === null) return <main className="page"><Carregando /></main>
  if (!paciente || !plano) return (
    <main className="page"><div className="empty">Dieta não encontrada neste aparelho. <Link to="/ajustes">Importar arquivo da dieta</Link></div></main>
  )

  const refeicoes = [...plano.refeicoes].filter((r) => opcoesDe(r).some((o) => o.itens.length)).sort((a, b) => minutos(a.horario) - minutos(b.horario))
  const feitas = diario?.refeicoes ?? {}
  const nFeitas = refeicoes.filter((r) => r.id in feitas).length
  const planejado = somar(refeicoes.map((r) => totaisItens(opcoesDe(r)[0].itens)))
  const consumido = somar(refeicoes.filter((r) => r.id in feitas).map((r) => totaisItens((opcoesDe(r)[feitas[r.id]] ?? opcoesDe(r)[0]).itens)))
  const ehHoje = data === hojeISO()
  const agora = minutos(horaAgora())
  const proxima = ehHoje ? refeicoes.find((r) => !(r.id in feitas) && minutos(r.horario) >= agora - 90) : undefined
  const tomadas = diario?.formulas.length ?? 0
  const primeiroNome = paciente.nome.trim().split(/\s+/)[0]

  return (
    <main className="page" style={{ paddingTop: 24 }}>
      <div className="between" style={{ alignItems: 'flex-start' }}>
        <div className="stack" style={{ gap: 2 }}>
          <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Minha dieta</span>
          <h1 className="h1" style={{ textTransform: 'capitalize' }}>Olá, {primeiroNome}</h1>
        </div>
        <Link className="icon-btn" to="/ajustes" aria-label="Ajustes"><Icon n="ajustes" /></Link>
      </div>

      <div className="between" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 4 }}>
        <button type="button" className="icon-btn" style={{ border: 0 }} aria-label="Dia anterior" onClick={() => setData(somarDias(data, -1))}><Icon n="voltar" /></button>
        <button type="button" onClick={() => setData(hojeISO())} style={{ all: 'unset', cursor: 'pointer', fontWeight: 700, fontSize: 15, textAlign: 'center' }}>
          {ehHoje ? 'Hoje · ' : ''}<span>{diaCurto(data)}</span>
        </button>
        <button type="button" className="icon-btn" style={{ border: 0 }} aria-label="Próximo dia" disabled={ehHoje} onClick={() => setData(somarDias(data, 1))}><Icon n="seta" /></button>
      </div>

      <section className="card dark" aria-label="Progresso do dia" style={{ gap: 12 }}>
        <div className="between" style={{ alignItems: 'baseline' }}>
          <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
            <span className="num" style={{ fontSize: 40, fontWeight: 700, lineHeight: 1 }}>{nFeitas}</span>
            <span style={{ fontSize: 15, color: 'var(--dark-muted)' }}>de {refeicoes.length} refeições</span>
          </div>
          <span className="num" style={{ fontSize: 13, color: 'var(--lime)', fontWeight: 600 }}>{f0(consumido.kcal)} / {f0(planejado.kcal)} kcal</span>
        </div>
        <div className="split" aria-hidden="true" style={{ background: 'var(--dark-line)' }}>
          <div style={{ width: `${refeicoes.length ? (nFeitas / refeicoes.length) * 100 : 0}%`, background: 'var(--lime)' }} />
        </div>
        <div className="grid3">
          {([['Proteína', consumido.p, planejado.p], ['Carboidrato', consumido.c, planejado.c], ['Gordura', consumido.g, planejado.g]] as const).map(([n, x, m]) => (
            <div key={n} className="stack" style={{ gap: 2 }}>
              <span style={{ fontSize: 12, color: 'var(--dark-muted)' }}>{n}</span>
              <span className="num" style={{ fontSize: 16, fontWeight: 600 }}>{f0(x)}<span style={{ color: 'var(--dark-muted)', fontWeight: 500 }}> / {f0(m)} g</span></span>
            </div>
          ))}
        </div>
        {formulas > 0 && (
          <Link to={`/u/${pid}/suplementos`} style={{ color: 'var(--lime)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon n="capsula" size={16} /> Suplementos: {tomadas} de {formulas} tomados
          </Link>
        )}
      </section>

      {refeicoes.length === 0 && <div className="empty muted">O plano ainda não tem refeições.</div>}

      {refeicoes.map((r) => (
        <CartaoRefeicao key={r.id} r={r} feita={r.id in feitas ? feitas[r.id] : null} proxima={proxima?.id === r.id}
          aoMarcar={(op) => alterarDiario(pid, data, (d) => { if (op == null) delete d.refeicoes[r.id]; else d.refeicoes[r.id] = op })} />
      ))}

      {plano.obsVisivel && plano.observacoes.trim() && (
        <Link to={`/u/${pid}/orientacoes`} className="tile">
          <Icon n="lista" />
          <span style={{ flex: 1, fontWeight: 600 }}>Orientações do profissional</span>
          <Icon n="seta" />
        </Link>
      )}
    </main>
  )
}

function CartaoRefeicao({ r, feita, proxima, aoMarcar }: { r: Refeicao; feita: number | null; proxima: boolean; aoMarcar: (opcao: number | null) => void }) {
  const opcoes = opcoesDe(r).filter((o) => o.itens.length)
  const [sel, setSel] = useState(feita ?? 0)
  useEffect(() => { if (feita != null) setSel(feita) }, [feita])
  const atual = opcoes[sel] ?? opcoes[0]
  const t = totaisItens(atual.itens)
  const borda = feita != null ? 'var(--brand)' : proxima ? 'var(--ink)' : 'var(--line)'

  return (
    <section className="card" aria-labelledby={`h-${r.id}`} style={{ gap: 12, padding: 16, borderColor: borda, borderWidth: proxima || feita != null ? 2 : 1, background: feita != null ? '#F7FBF8' : 'var(--surface)' }}>
      <div className="between" style={{ alignItems: 'flex-start' }}>
        <div className="stack" style={{ gap: 3 }}>
          <span className="num muted" style={{ fontSize: 13, fontWeight: 600 }}>
            {r.horario}{proxima && <span className="badge" style={{ marginLeft: 8, background: 'var(--ink)', color: '#fff' }}>PRÓXIMA</span>}
          </span>
          <h2 id={`h-${r.id}`} style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>{r.nome}</h2>
        </div>
        <button type="button" onClick={() => aoMarcar(feita != null ? null : sel)} aria-pressed={feita != null}
          className="btn sm" style={feita != null ? { background: 'var(--brand)', borderColor: 'var(--brand)', color: '#fff' } : undefined}>
          <Icon n="ok" size={18} stroke={2.4} />{feita != null ? 'Feita' : 'Marcar'}
        </button>
      </div>

      {r.obs && <div className="note warn" style={{ padding: '10px 12px' }}><Icon n="info" size={16} /><span>{r.obs}</span></div>}

      {opcoes.length > 1 && (
        <div className="seg" role="group" aria-label={`Opções de ${r.nome}`}>
          {opcoes.map((o, i) => <button key={i} type="button" aria-pressed={sel === i} onClick={() => { setSel(i); if (feita != null) aoMarcar(i) }}>{o.nome}</button>)}
        </div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
        {atual.itens.map((it, i) => <LinhaAlimento key={it.id} it={it} primeiro={i === 0} />)}
      </ul>

      <span className="num muted" style={{ fontSize: 12 }}>{f0(t.kcal)} kcal · P {f1(t.p)} · C {f1(t.c)} · G {f1(t.g)}</span>
    </section>
  )
}

function LinhaAlimento({ it, primeiro }: { it: Item; primeiro: boolean }) {
  const alts = it.alternativas ?? []
  return (
    <li style={{ padding: '10px 0', borderTop: primeiro ? 0 : '1px solid var(--bg)', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="between" style={{ alignItems: 'baseline' }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{it.nome}</span>
        <span className="num" style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>{quantidade(it.gramas, it.medida)}</span>
      </div>
      {it.obs && <span className="muted" style={{ fontSize: 12 }}>{it.obs}</span>}
      {alts.length > 0 && (
        <details>
          <summary style={{ cursor: 'pointer', color: 'var(--brand)', fontSize: 13, fontWeight: 700, minHeight: 32, display: 'flex', alignItems: 'center', gap: 4, listStyle: 'none' }}>
            <Icon n="troca" size={15} /> ou {alts.length} {alts.length === 1 ? 'substituição' : 'substituições'}
          </summary>
          <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: '8px 12px', background: 'var(--soft)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alts.map((a, j) => (
              <li key={j} className="between" style={{ fontSize: 14, alignItems: 'baseline' }}>
                <span>{a.nome}</span>
                <span className="num" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{quantidade(a.gramas, a.medida)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  )
}
