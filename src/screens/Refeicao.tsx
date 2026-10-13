import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Carregando, Sheet, TopBar } from '../components/ui'
import { alterarPlano, uid } from '../lib/db'
import { useAlimentos, usePaciente, usePlano } from '../lib/hooks'
import { buscarAlimentos, distribuicao, equivalente, f0, f1, fa, lerNumero, macroPrincipal, paraGramas, totaisRefeicao, type BaseTroca } from '../lib/nutri'
import { idTaco } from '../lib/taco'
import type { Alimento, Item } from '../lib/types'

const passo = (g: number) => (g <= 20 ? 1 : 10)

export default function Refeicao() {
  const { pid = '', rid = '' } = useParams()
  const nav = useNavigate()
  const paciente = usePaciente(pid)
  const plano = usePlano(pid)
  const [editar, setEditar] = useState(false)
  const [trocar, setTrocar] = useState<Item | null>(null)

  if (plano === null || paciente === null) return <main className="page"><Carregando /></main>
  const r = plano?.refeicoes.find((x) => x.id === rid)
  if (!plano || !r) return <main className="page"><TopBar voltar={`/p/${pid}`} titulo="Refeição" /><div className="empty">Refeição não encontrada.</div></main>

  const t = totaisRefeicao(r)
  const d = distribuicao(t)
  const share = plano.meta.kcal > 0 ? Math.round((t.kcal / plano.meta.kcal) * 100) : null

  const setGramas = (itemId: string, g: number) =>
    alterarPlano(pid, (p) => {
      const it = p.refeicoes.find((x) => x.id === rid)?.itens.find((i) => i.id === itemId)
      if (it) it.gramas = Math.max(0, Math.round(g * 10) / 10)
    })
  const remover = (itemId: string) =>
    alterarPlano(pid, (p) => {
      const ref = p.refeicoes.find((x) => x.id === rid)
      if (ref) ref.itens = ref.itens.filter((i) => i.id !== itemId)
    })

  return (
    <main className="page">
      <TopBar voltar={`/p/${pid}`} titulo={paciente?.nome} direita={
        <button type="button" className="icon-btn" aria-label="Editar refeição" onClick={() => setEditar(true)}><Icon n="lapis" size={18} /></button>
      } />

      <div className="stack" style={{ gap: 4 }}>
        <h1 className="h1">{r.nome}</h1>
        <span className="muted" style={{ fontSize: 13 }}>{r.horario} · ajuste as gramas e os macros recalculam na hora</span>
      </div>

      <section className="card dark" aria-label="Total da refeição">
        <div className="between" style={{ alignItems: 'baseline' }}>
          <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
            <span className="num" style={{ fontSize: 40, fontWeight: 700, lineHeight: 1 }}>{f0(t.kcal)}</span>
            <span style={{ fontSize: 14, color: 'var(--dark-muted)' }}>kcal</span>
          </div>
          {share != null && <span style={{ fontSize: 13, color: 'var(--lime)', fontWeight: 600 }}>{share}% do dia</span>}
        </div>
        <div className="split" aria-hidden="true">
          <div style={{ width: `${d.p * 100}%`, background: '#6E93F2' }} />
          <div style={{ width: `${d.c * 100}%`, background: 'var(--c)' }} />
          <div style={{ width: `${d.g * 100}%`, background: '#B49CF0' }} />
        </div>
        <div className="grid3">
          {([['Proteína', t.p], ['Carboidrato', t.c], ['Gordura', t.g]] as const).map(([n, x]) => (
            <div key={n} className="stack" style={{ gap: 2 }}>
              <span style={{ fontSize: 12, color: 'var(--dark-muted)' }}>{n}</span>
              <span className="num" style={{ fontSize: 18, fontWeight: 600 }}>{f1(x)} g</span>
            </div>
          ))}
        </div>
      </section>

      <section className="stack" aria-labelledby="t-al">
        <h2 id="t-al" className="sec">Alimentos</h2>
        {r.itens.length === 0 && <div className="empty muted">Nenhum alimento nesta refeição ainda.</div>}
        {r.itens.map((it) => <LinhaItem key={it.id} it={it} aoGramas={(g) => setGramas(it.id, g)} aoRemover={() => remover(it.id)} aoTrocar={() => setTrocar(it)} />)}
        <Link to={`/p/${pid}/r/${rid}/buscar`} className="btn" style={{ border: '1.5px dashed #9FB0A7', background: 'transparent', color: 'var(--brand)' }}>
          <Icon n="mais" size={18} stroke={2.4} />Adicionar alimento
        </Link>
      </section>

      {editar && <EditarRefeicao nome={r.nome} horario={r.horario} aoFechar={() => setEditar(false)}
        aoSalvar={(nome, horario) => { alterarPlano(pid, (p) => { const x = p.refeicoes.find((y) => y.id === rid); if (x) { x.nome = nome; x.horario = horario } }); setEditar(false) }}
        aoExcluir={() => {
          if (!window.confirm(`Excluir a refeição “${r.nome}”?`)) return
          alterarPlano(pid, (p) => { p.refeicoes = p.refeicoes.filter((y) => y.id !== rid) })
          nav(`/p/${pid}`)
        }} />}
      {trocar && <TrocarSheet item={trocar} aoFechar={() => setTrocar(null)} aoTrocar={(a, gramas) => {
        alterarPlano(pid, (p) => {
          const ref = p.refeicoes.find((y) => y.id === rid)
          if (!ref) return
          ref.itens = ref.itens.map((i) => (i.id === trocar.id ? { id: uid(), ref: a.ref, nome: a.nome, fonte: a.fonte, por100: a.por100, gramas: Math.round(gramas) } : i))
        })
        setTrocar(null)
      }} />}
    </main>
  )
}

function LinhaItem({ it, aoGramas, aoRemover, aoTrocar }: { it: Item; aoGramas: (g: number) => void; aoRemover: () => void; aoTrocar: () => void }) {
  const [campo, setCampo] = useState(String(it.gramas).replace('.', ','))
  useEffect(() => { setCampo(String(it.gramas).replace('.', ',')) }, [it.gramas])
  const tt = paraGramas(it.por100, it.gramas)
  const id = idTaco(it.ref)
  const confirmar = () => {
    const g = lerNumero(campo)
    if (g != null && g >= 0) aoGramas(g)
    else setCampo(String(it.gramas).replace('.', ','))
  }
  return (
    <div className="card" style={{ padding: 14, gap: 10, borderRadius: 18 }}>
      <div className="between" style={{ alignItems: 'flex-start' }}>
        <div className="stack" style={{ gap: 3, minWidth: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{it.nome}</span>
          <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>
            {it.fonte === 'taco' ? `TACO #${id}` : 'Cadastro próprio'} · por 100 g: {fa(it.por100.kcal)} kcal
          </span>
        </div>
        <span className="num" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{f0(tt.kcal)} kcal</span>
      </div>
      <div className="between">
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="step" aria-label={`Diminuir ${it.nome}`} onClick={() => aoGramas(Math.max(0, it.gramas - passo(it.gramas)))}><Icon n="menos" size={16} stroke={2.4} /></button>
          <div className="unit" style={{ width: 82 }}>
            <label className="sr-only" htmlFor={`g-${it.id}`}>Gramas de {it.nome}</label>
            <input id={`g-${it.id}`} className="input num" inputMode="decimal" value={campo} onChange={(e) => setCampo(e.target.value)}
              onBlur={confirmar} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              style={{ textAlign: 'center', padding: '0 24px 0 8px', fontSize: 16 }} />
            <span>g</span>
          </div>
          <button type="button" className="step" aria-label={`Aumentar ${it.nome}`} onClick={() => aoGramas(it.gramas + passo(it.gramas))}><Icon n="mais" size={16} stroke={2.4} /></button>
        </div>
        <span className="num" style={{ fontSize: 12, textAlign: 'right' }}>P {f1(tt.p)} · C {f1(tt.c)} · G {f1(tt.g)}</span>
      </div>
      <div className="row" style={{ gap: 4, marginBottom: -6 }}>
        <button type="button" className="link-btn" onClick={aoTrocar}><Icon n="troca" size={16} />Trocar</button>
        <button type="button" className="link-btn" style={{ color: 'var(--danger)' }} onClick={aoRemover}><Icon n="lixo" size={16} />Remover</button>
      </div>
    </div>
  )
}

function EditarRefeicao({ nome, horario, aoFechar, aoSalvar, aoExcluir }: { nome: string; horario: string; aoFechar: () => void; aoSalvar: (n: string, h: string) => void; aoExcluir: () => void }) {
  const [n, setN] = useState(nome)
  const [h, setH] = useState(horario)
  return (
    <Sheet titulo="Editar refeição" aoFechar={aoFechar}>
      <div className="field"><label htmlFor="er-nome">Nome</label><input id="er-nome" className="input" value={n} onChange={(e) => setN(e.target.value)} /></div>
      <div className="field"><label htmlFor="er-hora">Horário</label><input id="er-hora" className="input" type="time" value={h} onChange={(e) => setH(e.target.value)} /></div>
      <button type="button" className="btn primary" disabled={!n.trim()} onClick={() => aoSalvar(n.trim(), h)}>Salvar</button>
      <button type="button" className="btn danger" onClick={aoExcluir}>Excluir refeição</button>
    </Sheet>
  )
}

const BASES: { k: BaseTroca; rotulo: string }[] = [
  { k: 'c', rotulo: 'Carbo' }, { k: 'p', rotulo: 'Proteína' }, { k: 'g', rotulo: 'Gordura' }, { k: 'kcal', rotulo: 'Calorias' },
]

/** Escolhe um alimento substituto e calcula a quantidade equivalente. */
function TrocarSheet({ item, aoFechar, aoTrocar }: { item: Item; aoFechar: () => void; aoTrocar: (a: Alimento, gramas: number) => void }) {
  const todos = useAlimentos()
  const [q, setQ] = useState('')
  const [base, setBase] = useState<BaseTroca>(macroPrincipal(item.por100))
  const [escolhido, setEscolhido] = useState<Alimento | null>(null)
  const res = useMemo(() => buscarAlimentos(todos, q, 30).filter((a) => a.ref !== item.ref), [todos, q, item.ref])
  const eq = escolhido ? equivalente(item.gramas, item.por100, escolhido.por100, base) : null
  const tEq = escolhido && eq ? paraGramas(escolhido.por100, eq) : null
  const tOrig = paraGramas(item.por100, item.gramas)

  return (
    <Sheet titulo={`Trocar ${item.nome.split(',')[0]}`} aoFechar={aoFechar}>
      <span className="muted" style={{ fontSize: 13 }}>{item.nome} · {fa(item.gramas)} g · P {f1(tOrig.p)} · C {f1(tOrig.c)} · G {f1(tOrig.g)}</span>
      <div className="field">
        <span className="lbl" id="tr-base">Equivaler por</span>
        <div className="seg" role="group" aria-labelledby="tr-base">
          {BASES.map((b) => <button key={b.k} type="button" aria-pressed={base === b.k} onClick={() => setBase(b.k)}>{b.rotulo}</button>)}
        </div>
      </div>
      {escolhido ? (
        <div className="card" style={{ padding: 14, gap: 10 }}>
          <span style={{ fontWeight: 700 }}>{escolhido.nome}</span>
          {eq && tEq ? (
            <>
              <span className="num" style={{ fontSize: 28, fontWeight: 700 }}>{f0(eq)} g</span>
              <span className="num" style={{ fontSize: 13 }}>{f0(tEq.kcal)} kcal · P {f1(tEq.p)} · C {f1(tEq.c)} · G {f1(tEq.g)}</span>
              <div className="grid2">
                <button type="button" className="btn" onClick={() => setEscolhido(null)}>Escolher outro</button>
                <button type="button" className="btn primary" onClick={() => aoTrocar(escolhido, eq)}>Trocar</button>
              </div>
            </>
          ) : (
            <>
              <span className="note warn">Um dos alimentos não tem esse nutriente. Escolha outra base de troca.</span>
              <button type="button" className="btn" onClick={() => setEscolhido(null)}>Escolher outro</button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="search">
            <label htmlFor="tr-q" className="sr-only">Buscar substituto</label>
            <Icon n="busca" size={18} />
            <input id="tr-q" className="input" type="search" placeholder="Buscar substituto" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {res.map((a) => {
              const g = equivalente(item.gramas, item.por100, a.por100, base)
              return (
                <button key={a.ref} type="button" className="tile" style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit' }} onClick={() => setEscolhido(a)}>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{a.nome}</span>
                  <span className="num" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{g ? `${f0(g)} g` : '—'}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </Sheet>
  )
}
