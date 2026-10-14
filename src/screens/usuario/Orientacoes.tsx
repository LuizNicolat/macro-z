import { Link, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Carregando } from '../../components/ui'
import { dataBR } from '../../lib/datas'
import { useAvaliacoes, usePaciente, usePlano } from '../../lib/hooks'
import { classificarImc, f0, f1, imc } from '../../lib/nutri'

/** Orientações do profissional e resumo da última avaliação, para o paciente. */
export default function Orientacoes() {
  const { pid = '' } = useParams()
  const paciente = usePaciente(pid)
  const plano = usePlano(pid)
  const avs = useAvaliacoes(pid)

  if (paciente === null || plano === null || avs === null) return <main className="page"><Carregando /></main>
  if (!paciente || !plano) return <main className="page"><div className="empty">Dieta não encontrada.</div></main>

  const linhas = plano.obsVisivel ? plano.observacoes.split('\n').map((l) => l.trim()).filter(Boolean) : []
  const a = avs[0]

  return (
    <main className="page" style={{ paddingTop: 24 }}>
      <h1 className="h1">Orientações</h1>

      <section className="card" aria-labelledby="t-or">
        <h2 id="t-or" className="sec">Do seu profissional</h2>
        {linhas.length === 0 && <span className="muted" style={{ fontSize: 14 }}>Nenhuma orientação cadastrada.</span>}
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15, lineHeight: 1.5 }}>
          {linhas.map((l, i) => <li key={i}>{l.replace(/^[•\-–]\s*/, '')}</li>)}
        </ul>
      </section>

      {a && (
        <section className="card" aria-labelledby="t-av" style={{ gap: 12 }}>
          <div className="between">
            <h2 id="t-av" className="sec">Última avaliação</h2>
            <span className="muted" style={{ fontSize: 13 }}>{dataBR(a.data)}</span>
          </div>
          <div className="grid2">
            <div className="kpi"><span className="lbl">Peso</span><span className="val">{f1(a.pesoKg)} kg</span></div>
            <div className="kpi"><span className="lbl">Gordura corporal</span><span className="val">{a.gorduraPct != null ? `${f1(a.gorduraPct)}%` : '—'}</span></div>
            <div className="kpi"><span className="lbl">Massa magra</span><span className="val">{a.gorduraPct != null ? `${f1(a.pesoKg * (1 - a.gorduraPct / 100))} kg` : '—'}</span></div>
            <div className="kpi"><span className="lbl">IMC</span><span className="val">{f1(imc(a.pesoKg, a.alturaCm))}</span><span className="lbl" style={{ fontSize: 11 }}>{classificarImc(imc(a.pesoKg, a.alturaCm))}</span></div>
          </div>
          {plano.meta.kcal > 0 && <span className="muted" style={{ fontSize: 13 }}>Meta do plano: <b className="num" style={{ color: 'var(--ink)' }}>{f0(plano.meta.kcal)} kcal</b> · P {f0(plano.meta.p)} g · C {f0(plano.meta.c)} g · G {f0(plano.meta.g)} g</span>}
        </section>
      )}

      <Link className="btn" to={`/p/${pid}/imprimir`}><Icon n="baixar" size={18} />Plano completo em PDF</Link>
    </main>
  )
}
