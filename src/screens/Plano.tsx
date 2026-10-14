import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Avatar, BarraMeta, CampoNumero, Carregando, Donut, Legenda, MacroLinha, Sheet, TopBar } from '../components/ui'
import { alterarPlano, baixarJson, exportarPaciente, lembrarPaciente, slug, uid } from '../lib/db'
import { useAvaliacoes, useFormulas, usePaciente, usePlano } from '../lib/hooks'
import { f0, f1, fa, idadeEm, lerNumero, numParaCampo, totaisPlano, totaisRefeicao } from '../lib/nutri'
import type { Meta } from '../lib/types'

export default function Plano() {
  const { pid = '' } = useParams()
  const paciente = usePaciente(pid)
  const plano = usePlano(pid)
  const avs = useAvaliacoes(pid)
  const formulas = useFormulas(pid)
  const [obs, setObs] = useState<string | null>(null)
  const [editMeta, setEditMeta] = useState(false)
  const [novaRef, setNovaRef] = useState(false)

  useEffect(() => { if (pid) lembrarPaciente(pid) }, [pid])

  if (paciente === null || plano === null) return <main className="page"><Carregando /></main>
  if (!paciente || !plano) return (
    <main className="page"><TopBar voltar="/" titulo="Plano" /><div className="empty">Paciente não encontrado. <Link to="/">Voltar aos pacientes</Link></div></main>
  )

  const t = totaisPlano(plano)
  const m = plano.meta
  const ultima = avs?.[0]
  const idade = idadeEm(paciente.nascimento) ?? ultima?.idade
  const resumo = [idade != null ? `${idade} anos` : null, ultima ? `${fa(ultima.pesoKg)} kg` : null, paciente.objetivo || null].filter(Boolean).join(' · ')
  const temManual = plano.refeicoes.some((r) => r.itens.some((i) => i.fonte === 'propria'))
  const emUso = (formulas ?? []).filter((f) => f.status !== 'encerrada')
  const obsAtual = obs ?? plano.observacoes

  const salvarObs = () => {
    if (obs !== null && obs !== plano.observacoes) alterarPlano(pid, (p) => { p.observacoes = obs })
  }

  return (
    <main className="page">
      <TopBar voltar="/" titulo="Plano alimentar" direita={
        <Link className="icon-btn" to={`/p/${pid}/imprimir`} aria-label="Exportar PDF"><Icon n="baixar" /></Link>
      } />

      <div className="row" style={{ gap: 14 }}>
        <Avatar nome={paciente.nome} lg />
        <div className="stack" style={{ gap: 4, minWidth: 0, flex: 1 }}>
          <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Dieta de</span>
          <span className="num" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{paciente.nome}</span>
          {resumo && <span className="muted" style={{ fontSize: 13 }}>{resumo}</span>}
        </div>
        <Link className="icon-btn" to={`/paciente/${pid}`} aria-label="Editar dados do paciente"><Icon n="lapis" size={18} /></Link>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <span className="badge" style={{ background: 'var(--ink)', color: '#fff', padding: '7px 12px', borderRadius: 999, fontSize: 12 }}>
          Plano v{plano.versao} · {new Date(plano.atualizadoEm).toLocaleDateString('pt-BR')}
        </span>
        <Link to={`/p/${pid}/avaliacao`} className="badge" style={{ background: '#fff', border: '1px solid var(--line)', padding: '7px 12px', borderRadius: 999, fontSize: 12, textDecoration: 'none', color: 'var(--brand)' }}>
          {ultima ? `Avaliação de ${new Date(ultima.data + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Fazer avaliação física'}
        </Link>
        {ultima && ultima.deficit !== 0 && (
          <span className="badge" style={{ background: '#fff', border: '1px solid var(--line)', padding: '7px 12px', borderRadius: 999, fontSize: 12, color: 'var(--muted)' }}>
            {ultima.deficit > 0 ? `Déficit ${f0(ultima.deficit)} kcal` : `Superávit ${f0(-ultima.deficit)} kcal`}
          </span>
        )}
      </div>

      <section className="card" aria-labelledby="t-resumo" style={{ gap: 18 }}>
        <div className="between">
          <h2 id="t-resumo" className="sec">Resumo do dia</h2>
          <button type="button" className="link-btn" onClick={() => setEditMeta(true)}>Metas</button>
        </div>
        <div className="row" style={{ gap: 20 }}>
          <Donut t={t} meta={m} />
          <div className="stack" style={{ flex: 1, gap: 12 }}>
            <Legenda t={t} />
            {m.kcal > 0
              ? <span style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600 }}>{Math.round((t.kcal / m.kcal) * 100)}% da meta calórica</span>
              : <span className="muted" style={{ fontSize: 12 }}>Sem meta: faça a avaliação ou defina em “Metas”.</span>}
          </div>
        </div>
        <div className="stack" style={{ gap: 14 }}>
          <BarraMeta rotulo="Proteína" valor={t.p} meta={m.p} cor="var(--p)" extra={ultima?.pesoKg ? `${f1(t.p / ultima.pesoKg)} g/kg` : undefined} />
          <BarraMeta rotulo="Carboidrato" valor={t.c} meta={m.c} cor="var(--c)" />
          <BarraMeta rotulo="Gordura" valor={t.g} meta={m.g} cor="var(--g)" />
          <BarraMeta rotulo="Fibras" valor={t.fibra} meta={m.fibra} cor="var(--brand)" />
        </div>
        <span className="muted" style={{ fontSize: 12 }}>Sódio: {f0(t.sodio)} mg · Fonte: TACO{temManual ? ' + cadastros próprios' : ''}</span>
      </section>

      <section className="stack" aria-labelledby="t-ref">
        <div className="between">
          <h2 id="t-ref" className="sec">Refeições</h2>
          <button type="button" className="link-btn" onClick={() => setNovaRef(true)}><Icon n="mais" size={16} stroke={2.4} />Refeição</button>
        </div>
        {[...plano.refeicoes].sort((a, b) => a.horario.localeCompare(b.horario)).map((r) => {
          const tr = totaisRefeicao(r)
          return (
            <Link key={r.id} className="tile" to={`/p/${pid}/r/${r.id}`}>
              <div className="num muted" style={{ width: 52, flex: 'none', fontSize: 13, fontWeight: 600 }}>{r.horario}</div>
              <div className="stack" style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <span style={{ fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
                  {r.nome}
                  {r.itens.some((i) => i.fonte === 'propria') && <span className="badge manual">MANUAL</span>}
                  {(r.opcoes?.length ?? 0) > 0 && <span className="badge">{(r.opcoes?.length ?? 0) + 1} OPÇÕES</span>}
                </span>
                <span className="muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.itens.length ? r.itens.map((i) => i.nome.split(',')[0]).join(', ') : 'Toque para adicionar alimentos'}
                </span>
                {r.itens.length > 0 && <MacroLinha t={tr} />}
              </div>
              <span className="num" style={{ fontWeight: 700 }}>{f0(tr.kcal)}</span>
            </Link>
          )
        })}
      </section>

      <section className="card dark" aria-labelledby="t-man" style={{ gap: 12 }}>
        <div className="between">
          <h2 id="t-man" className="sec">Manipulados · {emUso.length} {emUso.length === 1 ? 'fórmula' : 'fórmulas'}</h2>
          <Link to={`/p/${pid}/manipulados`} style={{ color: 'var(--lime)', fontSize: 13, fontWeight: 700 }}>Gerenciar</Link>
        </div>
        {emUso.length === 0 && <span style={{ color: 'var(--dark-muted)', fontSize: 14 }}>Nenhuma fórmula cadastrada.</span>}
        {emUso.map((f) => (
          <div key={f.id} className="between" style={{ fontSize: 14 }}>
            <span>{f.nome}</span>
            <span style={{ color: 'var(--dark-muted)', textAlign: 'right' }}>{f.horario}</span>
          </div>
        ))}
      </section>

      <section className="stack" aria-labelledby="t-obs">
        <div className="between">
          <h2 id="t-obs" className="sec">Observações</h2>
          <label className="check" style={{ fontSize: 12, fontWeight: 600, gap: 8 }}>
            <input type="checkbox" checked={plano.obsVisivel} onChange={(e) => alterarPlano(pid, (p) => { p.obsVisivel = e.target.checked })} style={{ width: 18, height: 18 }} />
            Mostrar no PDF
          </label>
        </div>
        <label htmlFor="obs" className="sr-only">Observações do plano</label>
        <textarea id="obs" className="input" placeholder="Orientações, trocas permitidas, hidratação…" value={obsAtual}
          onChange={(e) => setObs(e.target.value)} onBlur={salvarObs} />
      </section>

      <section className="card" aria-labelledby="t-pac" style={{ gap: 10 }}>
        <h2 id="t-pac" className="sec">Para o paciente</h2>
        <span className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>O paciente importa o arquivo no Macro Z do celular dele (Ajustes → Importar) e o app abre direto na dieta, com as refeições do dia para marcar.</span>
        <div className="grid2">
          <Link className="btn" to={`/u/${pid}`}><Icon n="usuario" size={18} />Ver como paciente</Link>
          <button type="button" className="btn primary" onClick={async () => baixarJson(await exportarPaciente(pid), `dieta-${slug(paciente.nome)}.json`)}>
            <Icon n="baixar" size={18} />Arquivo da dieta
          </button>
        </div>
      </section>

      <div className="grid2">
        <button type="button" className="btn" onClick={() => {
          if (window.confirm('Fechar esta versão e começar a próxima? O conteúdo atual é mantido.')) alterarPlano(pid, (p) => { p.versao += 1 })
        }}>Nova versão</button>
        <Link className="btn primary" to={`/p/${pid}/imprimir`}>Exportar PDF</Link>
      </div>

      {editMeta && <MetaSheet meta={m} aoFechar={() => setEditMeta(false)} aoSalvar={(meta) => { alterarPlano(pid, (p) => { p.meta = meta }); setEditMeta(false) }} />}
      {novaRef && <NovaRefeicao aoFechar={() => setNovaRef(false)} aoSalvar={(nome, horario) => {
        alterarPlano(pid, (p) => { p.refeicoes.push({ id: uid(), nome, horario, itens: [] }) })
        setNovaRef(false)
      }} />}
    </main>
  )
}

function MetaSheet({ meta, aoFechar, aoSalvar }: { meta: Meta; aoFechar: () => void; aoSalvar: (m: Meta) => void }) {
  const [v, setV] = useState({ kcal: numParaCampo(Math.round(meta.kcal)), p: numParaCampo(Math.round(meta.p)), c: numParaCampo(Math.round(meta.c)), g: numParaCampo(Math.round(meta.g)), fibra: numParaCampo(meta.fibra) })
  const n = (s: string) => lerNumero(s) ?? 0
  const calc = n(v.p) * 4 + n(v.c) * 4 + n(v.g) * 9
  return (
    <Sheet titulo="Metas do plano" aoFechar={aoFechar}>
      <span className="muted" style={{ fontSize: 13 }}>Normalmente vêm da avaliação física. Aqui você ajusta à mão.</span>
      <CampoNumero id="mt-kcal" rotulo="Energia" unidade="kcal" valor={v.kcal} aoMudar={(s) => setV({ ...v, kcal: s })} />
      <div className="grid3">
        <CampoNumero id="mt-p" rotulo="Proteína" unidade="g" cor="var(--p-text)" valor={v.p} aoMudar={(s) => setV({ ...v, p: s })} />
        <CampoNumero id="mt-c" rotulo="Carboidrato" unidade="g" cor="var(--c-text)" valor={v.c} aoMudar={(s) => setV({ ...v, c: s })} />
        <CampoNumero id="mt-g" rotulo="Gordura" unidade="g" cor="var(--g-text)" valor={v.g} aoMudar={(s) => setV({ ...v, g: s })} />
      </div>
      <CampoNumero id="mt-f" rotulo="Fibras" unidade="g" valor={v.fibra} aoMudar={(s) => setV({ ...v, fibra: s })} />
      <span className="muted" style={{ fontSize: 13 }}>Pelos macros: <b className="num">{f0(calc)} kcal</b></span>
      <button type="button" className="btn primary" onClick={() => aoSalvar({ kcal: n(v.kcal), p: n(v.p), c: n(v.c), g: n(v.g), fibra: n(v.fibra) })}>Salvar metas</button>
    </Sheet>
  )
}

function NovaRefeicao({ aoFechar, aoSalvar }: { aoFechar: () => void; aoSalvar: (nome: string, horario: string) => void }) {
  const [nome, setNome] = useState('')
  const [horario, setHorario] = useState('10:00')
  return (
    <Sheet titulo="Nova refeição" aoFechar={aoFechar}>
      <div className="field"><label htmlFor="nr-nome">Nome</label>
        <input id="nr-nome" className="input" list="nomes-ref" placeholder="Ex.: Pré-treino" value={nome} onChange={(e) => setNome(e.target.value)} />
        <datalist id="nomes-ref"><option value="Lanche da manhã" /><option value="Pré-treino" /><option value="Pós-treino" /><option value="Ceia" /></datalist>
      </div>
      <div className="field"><label htmlFor="nr-hora">Horário</label><input id="nr-hora" className="input" type="time" value={horario} onChange={(e) => setHorario(e.target.value)} /></div>
      <button type="button" className="btn primary" disabled={!nome.trim()} onClick={() => aoSalvar(nome.trim(), horario)}>Adicionar refeição</button>
    </Sheet>
  )
}
