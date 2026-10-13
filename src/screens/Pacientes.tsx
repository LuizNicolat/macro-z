import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/ui'
import { db } from '../lib/db'
import { f0, normalizar, totaisPlano } from '../lib/nutri'

export default function Pacientes() {
  const [q, setQ] = useState('')
  const dados = useLiveQuery(async () => {
    const [ps, planos, avs] = await Promise.all([db.pacientes.orderBy('atualizadoEm').reverse().toArray(), db.planos.toArray(), db.avaliacoes.toArray()])
    const planoDe = new Map(planos.map((p) => [p.pacienteId, p]))
    const ultimaAv = new Map<string, string>()
    for (const a of avs) if ((ultimaAv.get(a.pacienteId) ?? '') < a.data) ultimaAv.set(a.pacienteId, a.data)
    return ps.map((p) => {
      const plano = planoDe.get(p.id)
      const nItens = plano?.refeicoes.reduce((s, r) => s + r.itens.length, 0) ?? 0
      return { p, plano, nItens, kcal: plano ? totaisPlano(plano).kcal : 0, ultimaAv: ultimaAv.get(p.id) }
    })
  }, [])

  const lista = (dados ?? []).filter((d) => !q || normalizar(d.p.nome).includes(normalizar(q)))
  const ativos = (dados ?? []).filter((d) => d.nItens > 0).length
  const semAv = (dados ?? []).filter((d) => !d.ultimaAv).length

  return (
    <main className="page" style={{ paddingTop: 28 }}>
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 2 }}>
          <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>Macro Z</span>
          <h1 className="h1">Pacientes</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link className="icon-btn" to="/ajustes" aria-label="Ajustes e backup"><Icon n="ajustes" /></Link>
          <Link className="btn primary pill" to="/paciente/novo"><Icon n="mais" size={18} stroke={2.2} />Novo</Link>
        </div>
      </div>

      <div className="search">
        <label htmlFor="busca-paciente" className="sr-only">Buscar paciente</label>
        <Icon n="busca" size={18} />
        <input id="busca-paciente" className="input" type="search" placeholder="Buscar por nome" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid3">
        <div className="kpi dark"><span className="val">{dados?.length ?? 0}</span><span className="lbl">Pacientes</span></div>
        <div className="kpi" style={{ background: '#fff', border: '1px solid var(--line)' }}><span className="val">{ativos}</span><span className="lbl">Com plano</span></div>
        <div className="kpi" style={{ background: '#fff', border: '1px solid var(--line)' }}><span className="val">{semAv}</span><span className="lbl">Sem avaliação</span></div>
      </div>

      <section className="stack" aria-labelledby="t-lista">
        <h2 id="t-lista" className="sec" style={{ marginTop: 4 }}>{q ? 'Resultados' : 'Recentes'}</h2>
        {dados && dados.length === 0 && (
          <div className="card" style={{ alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Nenhum paciente ainda</span>
            <span className="muted" style={{ fontSize: 14 }}>Cadastre o primeiro paciente para montar a dieta, registrar a avaliação física e as fórmulas manipuladas.</span>
            <Link className="btn primary" to="/paciente/novo">Cadastrar paciente</Link>
          </div>
        )}
        {lista.map(({ p, nItens, kcal, ultimaAv }) => (
          <Link key={p.id} className="tile" to={`/p/${p.id}`}>
            <Avatar nome={p.nome} />
            <div className="stack" style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{p.nome}</span>
              <span className="muted" style={{ fontSize: 13 }}>{[p.objetivo, nItens ? `${f0(kcal)} kcal` : 'sem alimentos'].filter(Boolean).join(' · ')}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: ultimaAv ? 'var(--brand)' : 'var(--warn-text)' }}>
                {ultimaAv ? `Avaliação de ${new Date(ultimaAv + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Avaliação pendente'}
              </span>
            </div>
            <Icon n="seta" />
          </Link>
        ))}
        {q && dados && lista.length === 0 && <div className="empty muted">Nenhum paciente com “{q}”.</div>}
      </section>
    </main>
  )
}
