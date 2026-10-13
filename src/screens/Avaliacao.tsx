import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { CampoNumero, Carregando, TopBar, useToast } from '../components/ui'
import { alterarPlano, db, hojeISO, lembrarPaciente, uid } from '../lib/db'
import { useAvaliacoes, usePaciente } from '../lib/hooks'
import { calcularMetas, classificarImc, f0, f1, idadeEm, imc, lerNumero, NIVEIS_ATIVIDADE, numParaCampo } from '../lib/nutri'
import type { Avaliacao as Av, Circunferencias, Sexo } from '../lib/types'

type Form = {
  id: string | null
  data: string; sexo: Sexo; idade: string; altura: string; peso: string; gordura: string; atividade: string; metodo: string
  cintura: string; abdomen: string; quadril: string; braco: string; coxa: string
  deficit: string; protKg: string; gordKg: string; notas: string
}

const CIRC: { k: keyof Circunferencias; rotulo: string }[] = [
  { k: 'cintura', rotulo: 'Cintura' }, { k: 'abdomen', rotulo: 'Abdômen' }, { k: 'quadril', rotulo: 'Quadril' },
  { k: 'braco', rotulo: 'Braço relaxado' }, { k: 'coxa', rotulo: 'Coxa' },
]

const METODOS = ['Bioimpedância', 'Dobras cutâneas', 'DEXA', 'Estimativa visual', 'Não avaliado']

function deAvaliacao(a: Av, manterId: boolean): Form {
  const c = (x: number | null) => numParaCampo(x)
  return {
    id: manterId ? a.id : null, data: manterId ? a.data : hojeISO(), sexo: a.sexo, idade: String(a.idade), altura: c(a.alturaCm), peso: c(a.pesoKg),
    gordura: c(a.gorduraPct), atividade: String(a.atividade), metodo: a.metodo,
    cintura: c(a.circ.cintura), abdomen: c(a.circ.abdomen), quadril: c(a.circ.quadril), braco: c(a.circ.braco), coxa: c(a.circ.coxa),
    deficit: c(a.deficit), protKg: c(a.protKg), gordKg: c(a.gordKg), notas: manterId ? a.notas : '',
  }
}

export default function Avaliacao() {
  const { pid = '' } = useParams()
  const paciente = usePaciente(pid)
  const avs = useAvaliacoes(pid)
  const [f, setF] = useState<Form | null>(null)
  const toast = useToast()

  useEffect(() => { if (pid) lembrarPaciente(pid) }, [pid])

  // Primeira carga: parte da última avaliação (nova data) ou dos dados do paciente.
  useEffect(() => {
    if (f || !paciente || !avs) return
    if (avs[0]) setF(deAvaliacao(avs[0], false))
    else setF({
      id: null, data: hojeISO(), sexo: paciente.sexo, idade: String(idadeEm(paciente.nascimento) ?? ''), altura: '', peso: '', gordura: '',
      atividade: '1.55', metodo: 'Bioimpedância', cintura: '', abdomen: '', quadril: '', braco: '', coxa: '',
      deficit: /emagre/i.test(paciente.objetivo) ? '400' : /hipertrof/i.test(paciente.objetivo) ? '-300' : '0', protKg: '2', gordKg: '0,8', notas: '',
    })
  }, [f, paciente, avs])

  if (paciente === null || avs === null || (paciente && !f)) return <main className="page"><Carregando /></main>
  if (!paciente || !f) return <main className="page"><TopBar voltar="/" titulo="Avaliação" /><div className="empty">Paciente não encontrado.</div></main>

  const set = (k: keyof Form) => (s: string) => setF({ ...f, [k]: s })
  const n = (s: string) => lerNumero(s)
  const peso = n(f.peso) ?? 0, altura = n(f.altura) ?? 0, idade = n(f.idade) ?? 0, gp = n(f.gordura)
  const completo = peso > 0 && altura > 0 && idade > 0
  const metas = calcularMetas({ sexo: f.sexo, pesoKg: peso, alturaCm: altura, idade, atividade: n(f.atividade) ?? 1.2, deficit: n(f.deficit) ?? 0, protKg: n(f.protKg) ?? 0, gordKg: n(f.gordKg) ?? 0 })
  const vImc = imc(peso, altura)
  const anterior = avs.find((a) => a.id !== f.id && a.data < f.data)
  const sinal = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '') + f1(Math.abs(x))
  const rcq = n(f.cintura) && n(f.quadril) ? n(f.cintura)! / n(f.quadril)! : null

  function montar(): Av {
    return {
      id: f!.id ?? uid(), pacienteId: pid, data: f!.data || hojeISO(), sexo: f!.sexo, idade, alturaCm: altura, pesoKg: peso, gorduraPct: gp,
      atividade: n(f!.atividade) ?? 1.2, metodo: f!.metodo,
      circ: { cintura: n(f!.cintura), abdomen: n(f!.abdomen), quadril: n(f!.quadril), braco: n(f!.braco), coxa: n(f!.coxa) },
      deficit: n(f!.deficit) ?? 0, protKg: n(f!.protKg) ?? 0, gordKg: n(f!.gordKg) ?? 0, notas: f!.notas,
    }
  }

  async function salvar(aplicar: boolean) {
    const a = montar()
    await db.avaliacoes.put(a)
    if (paciente && paciente.sexo !== a.sexo) await db.pacientes.update(pid, { sexo: a.sexo })
    if (aplicar) {
      await alterarPlano(pid, (p) => { p.meta = { kcal: Math.round(metas.kcal), p: Math.round(metas.p), c: Math.round(metas.c), g: Math.round(metas.g), fibra: metas.fibra } })
    }
    setF({ ...f!, id: a.id })
    toast.mostrar(aplicar ? 'Avaliação salva e metas aplicadas ao plano' : 'Avaliação salva')
  }

  return (
    <main className="page">
      <TopBar voltar={`/p/${pid}`} titulo={paciente.nome} />
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="h1">Avaliação física</h1>
        <span className="muted" style={{ fontSize: 13 }}>{f.id ? 'Editando avaliação salva' : 'Nova avaliação'}{anterior ? ` · anterior em ${new Date(anterior.data + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}</span>
      </div>

      <section className="card" aria-labelledby="t-dados">
        <h2 id="t-dados" className="sec">Dados básicos</h2>
        <div className="field"><label htmlFor="a-data">Data da avaliação</label><input id="a-data" className="input" type="date" value={f.data} onChange={(e) => set('data')(e.target.value)} /></div>
        <div className="seg" role="group" aria-label="Sexo">
          <button type="button" aria-pressed={f.sexo === 'F'} onClick={() => setF({ ...f, sexo: 'F' })}>Feminino</button>
          <button type="button" aria-pressed={f.sexo === 'M'} onClick={() => setF({ ...f, sexo: 'M' })}>Masculino</button>
        </div>
        <div className="grid2">
          <CampoNumero id="a-idade" rotulo="Idade" unidade="anos" valor={f.idade} aoMudar={set('idade')} />
          <CampoNumero id="a-alt" rotulo="Altura" unidade="cm" valor={f.altura} aoMudar={set('altura')} />
          <CampoNumero id="a-peso" rotulo="Peso" unidade="kg" valor={f.peso} aoMudar={set('peso')} />
          <CampoNumero id="a-gord" rotulo="Gordura corporal" unidade="%" valor={f.gordura} aoMudar={set('gordura')} />
        </div>
        <div className="field">
          <label htmlFor="a-ativ">Nível de atividade</label>
          <select id="a-ativ" className="input" value={f.atividade} onChange={(e) => set('atividade')(e.target.value)}>
            {NIVEIS_ATIVIDADE.map((x) => <option key={x.valor} value={String(x.valor)}>{x.rotulo}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="a-met">Método de composição corporal</label>
          <select id="a-met" className="input" value={f.metodo} onChange={(e) => set('metodo')(e.target.value)}>
            {METODOS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
      </section>

      <section className="card" aria-labelledby="t-res" style={{ gap: 12 }}>
        <h2 id="t-res" className="sec">Resultados</h2>
        {!completo && <span className="muted" style={{ fontSize: 13 }}>Preencha idade, altura e peso para calcular.</span>}
        <div className="grid2">
          <div className="kpi"><span className="lbl">IMC</span><span className="val">{completo ? f1(vImc) : '—'}</span><span className="lbl" style={{ fontSize: 11 }}>{completo ? classificarImc(vImc) : ''}</span></div>
          <div className="kpi"><span className="lbl">Massa magra</span><span className="val">{completo && gp != null ? `${f1(peso * (1 - gp / 100))} kg` : '—'}</span><span className="lbl" style={{ fontSize: 11 }}>{completo && gp != null ? `Gorda: ${f1(peso * gp / 100)} kg` : 'Informe o % de gordura'}</span></div>
          <div className="kpi"><span className="lbl">TMB (Mifflin)</span><span className="val">{completo ? f0(metas.tmb) : '—'}</span><span className="lbl" style={{ fontSize: 11 }}>kcal/dia em repouso</span></div>
          <div className="kpi dark"><span className="lbl">Gasto total</span><span className="val">{completo ? f0(metas.get) : '—'}</span><span className="lbl" style={{ fontSize: 11 }}>kcal/dia (TMB × atividade)</span></div>
        </div>
        {anterior && completo && (
          <>
            <div className="grid3" style={{ paddingTop: 4 }}>
              <div className="stack" style={{ gap: 2 }}><span className="muted" style={{ fontSize: 11 }}>Peso</span><span className="num" style={{ fontWeight: 700 }}>{sinal(peso - anterior.pesoKg)} kg</span></div>
              <div className="stack" style={{ gap: 2 }}><span className="muted" style={{ fontSize: 11 }}>% gordura</span><span className="num" style={{ fontWeight: 700 }}>{gp != null && anterior.gorduraPct != null ? `${sinal(gp - anterior.gorduraPct)} p.p.` : '—'}</span></div>
              <div className="stack" style={{ gap: 2 }}><span className="muted" style={{ fontSize: 11 }}>Cintura</span><span className="num" style={{ fontWeight: 700 }}>{n(f.cintura) != null && anterior.circ.cintura != null ? `${sinal(n(f.cintura)! - anterior.circ.cintura)} cm` : '—'}</span></div>
            </div>
            <span className="muted" style={{ fontSize: 11 }}>Variação desde {new Date(anterior.data + 'T00:00:00').toLocaleDateString('pt-BR')} ({f1(anterior.pesoKg)} kg{anterior.gorduraPct != null ? ` · ${f1(anterior.gorduraPct)}%` : ''})</span>
          </>
        )}
      </section>

      <section className="card" aria-labelledby="t-circ">
        <h2 id="t-circ" className="sec">Circunferências</h2>
        <div className="grid2">
          {CIRC.map((c) => <CampoNumero key={c.k} id={`a-${c.k}`} rotulo={c.rotulo} unidade="cm" valor={f[c.k]} aoMudar={set(c.k)} />)}
        </div>
        {rcq && <span className="muted" style={{ fontSize: 12 }}>Relação cintura/quadril: <b className="num" style={{ color: 'var(--ink)' }}>{rcq.toFixed(2).replace('.', ',')}</b></span>}
        <div className="field"><label htmlFor="a-notas">Anotações da avaliação</label><textarea id="a-notas" className="input" style={{ minHeight: 80 }} value={f.notas} onChange={(e) => set('notas')(e.target.value)} /></div>
      </section>

      <section className="card accent" aria-labelledby="t-meta">
        <h2 id="t-meta" className="sec" style={{ color: 'var(--brand)' }}>Metas para o plano</h2>
        <div className="grid3">
          <CampoNumero id="a-def" rotulo="Déficit" unidade="kcal" valor={f.deficit} aoMudar={set('deficit')} />
          <CampoNumero id="a-pkg" rotulo="Proteína" unidade="g/kg" valor={f.protKg} aoMudar={set('protKg')} />
          <CampoNumero id="a-gkg" rotulo="Gordura" unidade="g/kg" valor={f.gordKg} aoMudar={set('gordKg')} />
        </div>
        <div className="grid4" style={{ padding: 14, borderRadius: 16, background: 'var(--soft)' }}>
          {([[metas.kcal, 'kcal', 'var(--ink)'], [metas.p, 'prot. g', 'var(--p-text)'], [metas.c, 'carb. g', 'var(--c-text)'], [metas.g, 'gord. g', 'var(--g-text)']] as const).map(([x, r, cor]) => (
            <div key={r} className="stack" style={{ gap: 2 }}>
              <span className="num" style={{ fontSize: 18, fontWeight: 700, color: cor }}>{completo ? f0(x) : '—'}</span>
              <span className="muted" style={{ fontSize: 11 }}>{r}</span>
            </div>
          ))}
        </div>
        <span className="muted" style={{ fontSize: 12 }}>Use déficit negativo para superávit. Carboidrato = calorias restantes ÷ 4.</span>
        <button type="button" className="btn primary" disabled={!completo} onClick={() => salvar(true)}>Salvar e aplicar metas ao plano</button>
        <button type="button" className="btn" disabled={!completo} onClick={() => salvar(false)}>Só salvar a avaliação</button>
      </section>

      {avs.length > 0 && (
        <section className="stack" aria-labelledby="t-hist">
          <div className="between">
            <h2 id="t-hist" className="sec">Histórico</h2>
            <button type="button" className="link-btn" onClick={() => setF(avs[0] ? deAvaliacao(avs[0], false) : f)}><Icon n="mais" size={16} stroke={2.4} />Nova</button>
          </div>
          {avs.map((a) => (
            <button key={a.id} type="button" className="tile" style={{ cursor: 'pointer', font: 'inherit', textAlign: 'left', borderColor: a.id === f.id ? 'var(--brand)' : undefined }} onClick={() => setF(deAvaliacao(a, true))}>
              <span className="num" style={{ fontWeight: 700, width: 92 }}>{new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
              <span className="num" style={{ flex: 1, fontSize: 13 }}>{f1(a.pesoKg)} kg{a.gorduraPct != null ? ` · ${f1(a.gorduraPct)}%` : ''}</span>
              <Icon n="seta" />
            </button>
          ))}
          {f.id && (
            <button type="button" className="btn danger" onClick={async () => {
              if (!window.confirm('Excluir esta avaliação?')) return
              await db.avaliacoes.delete(f.id!)
              setF(null)
            }}>Excluir avaliação selecionada</button>
          )}
        </section>
      )}

      <Link className="btn" to={`/p/${pid}`}>Ir para o plano alimentar</Link>
      {toast.el}
    </main>
  )
}
