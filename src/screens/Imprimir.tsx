import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Carregando } from '../components/ui'
import { useAvaliacoes, useFormulas, usePaciente, usePlano } from '../lib/hooks'
import { distribuicao, f0, f1, fa, idadeEm, paraGramas, pct, totaisPlano, totaisRefeicao } from '../lib/nutri'
import { FONTE_TACO } from '../lib/taco'

/** Versão para imprimir ou salvar como PDF (pelo diálogo de impressão do navegador). */
export default function Imprimir() {
  const { pid = '' } = useParams()
  const paciente = usePaciente(pid)
  const plano = usePlano(pid)
  const avs = useAvaliacoes(pid)
  const formulas = useFormulas(pid)

  useEffect(() => {
    if (paciente) document.title = `Plano alimentar — ${paciente.nome}`
    return () => { document.title = 'Macro Z' }
  }, [paciente])

  if (paciente === null || plano === null || avs === null || formulas === null) return <Carregando />
  if (!paciente || !plano) return <div className="empty">Plano não encontrado.</div>

  const t = totaisPlano(plano)
  const d = distribuicao(t)
  const ultima = avs[0]
  const idade = idadeEm(paciente.nascimento) ?? ultima?.idade
  const ativas = formulas.filter((f) => f.status !== 'encerrada')
  const refeicoes = [...plano.refeicoes].filter((r) => r.itens.length).sort((a, b) => a.horario.localeCompare(b.horario))

  return (
    <>
      <div className="no-print" style={{ maxWidth: 800, margin: '0 auto', padding: '16px 20px', display: 'flex', gap: 10, justifyContent: 'space-between' }}>
        <Link className="btn sm" to={`/p/${pid}`}><Icon n="voltar" size={18} />Voltar</Link>
        <button type="button" className="btn primary sm" onClick={() => window.print()}><Icon n="baixar" size={18} />Imprimir / salvar PDF</button>
      </div>
      <article className="print">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, borderBottom: '2px solid #12201A', paddingBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: '#555' }}>Plano alimentar · versão {plano.versao} · {new Date(plano.atualizadoEm).toLocaleDateString('pt-BR')}</div>
            <h1>{paciente.nome}</h1>
            <div style={{ color: '#444' }}>{[idade != null ? `${idade} anos` : null, ultima ? `${fa(ultima.pesoKg)} kg` : null, paciente.objetivo || null].filter(Boolean).join(' · ')}</div>
          </div>
          <div style={{ textAlign: 'right', fontFamily: 'var(--num)', fontWeight: 700, fontSize: 20 }}>Macro Z</div>
        </header>

        <h2>Resumo diário</h2>
        <table>
          <thead><tr><th></th><th className="n">Planejado</th><th className="n">Meta</th><th className="n">% kcal</th></tr></thead>
          <tbody>
            <tr><td>Energia</td><td className="n">{f0(t.kcal)} kcal</td><td className="n">{plano.meta.kcal ? `${f0(plano.meta.kcal)} kcal` : '—'}</td><td className="n"></td></tr>
            <tr><td>Proteína</td><td className="n">{f1(t.p)} g</td><td className="n">{plano.meta.p ? `${f0(plano.meta.p)} g` : '—'}</td><td className="n">{pct(d.p)}</td></tr>
            <tr><td>Carboidrato</td><td className="n">{f1(t.c)} g</td><td className="n">{plano.meta.c ? `${f0(plano.meta.c)} g` : '—'}</td><td className="n">{pct(d.c)}</td></tr>
            <tr><td>Gordura</td><td className="n">{f1(t.g)} g</td><td className="n">{plano.meta.g ? `${f0(plano.meta.g)} g` : '—'}</td><td className="n">{pct(d.g)}</td></tr>
            <tr><td>Fibras</td><td className="n">{f1(t.fibra)} g</td><td className="n">{plano.meta.fibra ? `${f0(plano.meta.fibra)} g` : '—'}</td><td className="n"></td></tr>
          </tbody>
        </table>

        <h2>Refeições</h2>
        <table>
          <thead><tr><th>Alimento</th><th className="n">Qtd.</th><th className="n">kcal</th><th className="n">P</th><th className="n">C</th><th className="n">G</th></tr></thead>
          {refeicoes.map((r) => {
            const tr = totaisRefeicao(r)
            return (
              <tbody key={r.id}>
                <tr className="meal-h"><td>{r.horario} · {r.nome}</td><td></td><td className="n">{f0(tr.kcal)}</td><td className="n">{f1(tr.p)}</td><td className="n">{f1(tr.c)}</td><td className="n">{f1(tr.g)}</td></tr>
                {r.itens.map((i) => {
                  const ti = paraGramas(i.por100, i.gramas)
                  return <tr key={i.id}><td>{i.nome}</td><td className="n">{fa(i.gramas)} g</td><td className="n">{f0(ti.kcal)}</td><td className="n">{f1(ti.p)}</td><td className="n">{f1(ti.c)}</td><td className="n">{f1(ti.g)}</td></tr>
                })}
              </tbody>
            )
          })}
        </table>
        {refeicoes.length === 0 && <p style={{ color: '#555' }}>Nenhum alimento no plano ainda.</p>}

        {ativas.length > 0 && (
          <>
            <h2>Manipulados</h2>
            <table>
              <thead><tr><th>Fórmula</th><th>Composição</th><th>Posologia</th><th>Horário</th><th>Duração</th></tr></thead>
              <tbody>
                {ativas.map((f) => (
                  <tr key={f.id}>
                    <td><b>{f.nome}</b><br /><span style={{ color: '#555' }}>{f.forma}</span></td>
                    <td>{f.ativos.map((a, j) => <div key={j}>{a.nome} {a.dose}</div>)}</td>
                    <td>{f.posologia}</td><td>{f.horario}</td><td>{f.duracao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {plano.obsVisivel && plano.observacoes.trim() && (
          <>
            <h2>Observações</h2>
            <p style={{ whiteSpace: 'pre-line', lineHeight: 1.5, margin: 0 }}>{plano.observacoes}</p>
          </>
        )}

        <p style={{ marginTop: 24, fontSize: 10, color: '#666' }}>Valores nutricionais: {FONTE_TACO}; alimentos fora da tabela conforme rótulo ou cadastro do profissional.</p>
      </article>
    </>
  )
}
