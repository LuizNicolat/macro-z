import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { CampoNumero, Sheet, TopBar, useToast } from '../components/ui'
import { alterarPlano, uid } from '../lib/db'
import { useAlimentos, usePlano } from '../lib/hooks'
import { buscarAlimentos, f0, f1, fa, lerNumero, paraGramas, semDados } from '../lib/nutri'
import { FILTROS, idTaco } from '../lib/taco'
import type { Alimento } from '../lib/types'

/**
 * Busca na TACO + base própria.
 * Em /p/:pid/r/:rid/buscar adiciona à refeição; em /alimentos só consulta.
 */
export default function Buscar() {
  const { pid, rid } = useParams()
  const modoRefeicao = !!(pid && rid)
  const plano = usePlano(pid)
  const refeicao = plano?.refeicoes.find((r) => r.id === rid)
  const todos = useAlimentos()
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') ?? ''
  const [filtro, setFiltro] = useState(0)
  const [sel, setSel] = useState<Alimento | null>(null)
  const toast = useToast()

  const res = useMemo(() => {
    const cats = FILTROS[filtro].cats as readonly string[] | null
    const base = cats ? todos.filter((a) => cats.includes(a.categoria)) : todos
    if (!q.trim()) return cats ? base.slice(0, 150) : []
    return buscarAlimentos(base, q, 100)
  }, [todos, q, filtro])

  const voltar = modoRefeicao ? `/p/${pid}/r/${rid}` : undefined
  const linkOnline = modoRefeicao ? `/p/${pid}/r/${rid}/online?q=${encodeURIComponent(q)}` : `/alimentos/online?q=${encodeURIComponent(q)}`
  const linkCadastro = modoRefeicao ? `/alimentos/novo?p=${pid}&r=${rid}&nome=${encodeURIComponent(q)}` : `/alimentos/novo?nome=${encodeURIComponent(q)}`

  return (
    <main className="page">
      <TopBar voltar={voltar} titulo={modoRefeicao ? `Adicionar ao ${refeicao?.nome ?? 'plano'}` : 'Alimentos'} direita={
        !modoRefeicao ? <Link className="icon-btn" to="/alimentos/novo" aria-label="Cadastrar alimento"><Icon n="mais" /></Link> : undefined
      } />

      <div className="search">
        <label htmlFor="q" className="sr-only">Buscar alimento</label>
        <Icon n="busca" size={18} />
        <input id="q" className="input" type="search" autoComplete="off" autoFocus placeholder="Ex.: frango, arroz, whey" value={q}
          onChange={(e) => setSp(e.target.value ? { q: e.target.value } : {}, { replace: true })} style={{ borderWidth: 2, borderColor: 'var(--brand)' }} />
      </div>

      <div className="chips" role="group" aria-label="Filtrar por categoria">
        {FILTROS.map((f, i) => <button key={f.rotulo} type="button" className="chip" aria-pressed={filtro === i} onClick={() => setFiltro(i)}>{f.rotulo}</button>)}
      </div>

      {(q || filtro > 0) && (
        <div className="between muted" style={{ fontSize: 12 }}>
          <span><b className="num" style={{ color: 'var(--ink)' }}>{res.length}</b> resultado(s) · valores por 100 g</span>
          <span>TACO: 597 alimentos</span>
        </div>
      )}

      {!q && filtro === 0 && (
        <div className="empty muted" style={{ fontSize: 14 }}>Digite o nome do alimento. A busca ignora acentos e a ordem das palavras: “frango grelhado” encontra “Frango, peito, sem pele, grelhado”.</div>
      )}

      <div className="stack" style={{ gap: 8 }}>
        {res.map((a) => {
          const vazio = semDados(a.por100)
          return (
            <div key={a.ref} className="tile" style={{ padding: '12px 12px 12px 14px' }}>
              <button type="button" onClick={() => setSel(a)} style={{ all: 'unset', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{a.nome}{a.marca ? <span className="muted" style={{ fontWeight: 500 }}> · {a.marca}</span> : null}</span>
                {vazio
                  ? <span className="badge warn" style={{ alignSelf: 'flex-start' }}>Sem dados na TACO</span>
                  : <span className="num" style={{ fontSize: 12 }}><b>{fa(a.por100.kcal)} kcal</b> · P {fa(a.por100.p)} · C {fa(a.por100.c)} · G {fa(a.por100.g)}</span>}
                <span className="muted" style={{ fontSize: 11 }}>{a.fonte === 'propria' ? 'Minha base' : `${a.categoria} · #${idTaco(a.ref)}`}</span>
              </button>
              {modoRefeicao && (
                <button type="button" className="icon-btn" style={{ background: 'var(--brand-soft)', border: 0, color: 'var(--brand)' }} aria-label={`Adicionar ${a.nome}`} onClick={() => setSel(a)}>
                  <Icon n="mais" size={18} stroke={2.4} />
                </button>
              )}
            </div>
          )
        })}

        {q && res.length === 0 && (
          <div className="empty">
            <span style={{ fontWeight: 700, fontSize: 16 }}>Nada encontrado para “{q}”</span>
            <span className="muted" style={{ fontSize: 13, maxWidth: 280 }}>Produtos industrializados e suplementos geralmente não estão na TACO.</span>
          </div>
        )}

        <div className="card dark" style={{ padding: 14, gap: 10, borderRadius: 18 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Não encontrou o alimento?</span>
          <div className="grid2" style={{ gap: 8 }}>
            <Link className="btn lime sm" to={linkOnline}>Buscar online</Link>
            <Link className="btn sm" style={{ background: 'var(--dark-line)', borderColor: 'var(--dark-line)', color: '#fff' }} to={linkCadastro}>Cadastrar manual</Link>
          </div>
        </div>
      </div>

      {sel && (modoRefeicao
        ? <AdicionarSheet a={sel} aoFechar={() => setSel(null)} aoAdicionar={(gramas) => {
            alterarPlano(pid!, (p) => {
              p.refeicoes.find((r) => r.id === rid)?.itens.push({ id: uid(), ref: sel.ref, nome: sel.nome, fonte: sel.fonte, por100: sel.por100, gramas })
            })
            toast.mostrar(`${sel.nome.split(',')[0]} · ${fa(gramas)} g no ${refeicao?.nome ?? 'plano'}`)
            setSel(null)
          }} />
        : <DetalheSheet a={sel} aoFechar={() => setSel(null)} />)}
      {toast.el}
    </main>
  )
}

function TabelaNutrientes({ a, gramas }: { a: Alimento; gramas: number }) {
  const t = paraGramas(a.por100, gramas)
  const linhas: [string, string, string][] = [
    ['Energia', a.por100.kcal == null ? '—' : `${f0(t.kcal)} kcal`, ''],
    ['Proteína', a.por100.p == null ? '—' : `${f1(t.p)} g`, 'var(--p-text)'],
    ['Carboidrato', a.por100.c == null ? '—' : `${f1(t.c)} g`, 'var(--c-text)'],
    ['Gordura', a.por100.g == null ? '—' : `${f1(t.g)} g`, 'var(--g-text)'],
    ['Fibra', a.por100.fibra == null ? '—' : `${f1(t.fibra)} g`, ''],
    ['Sódio', a.por100.sodio == null ? '—' : `${f0(t.sodio)} mg`, ''],
  ]
  return (
    <div className="card" style={{ padding: 14, gap: 0 }}>
      {linhas.map(([n, x, cor], i) => (
        <div key={n} className="between" style={{ padding: '8px 0', borderTop: i ? '1px solid var(--bg)' : 0, fontSize: 14 }}>
          <span style={cor ? { color: cor, fontWeight: 600 } : undefined}>{n}</span>
          <span className="num" style={{ fontWeight: 600 }}>{x}</span>
        </div>
      ))}
    </div>
  )
}

function AdicionarSheet({ a, aoFechar, aoAdicionar }: { a: Alimento; aoFechar: () => void; aoAdicionar: (g: number) => void }) {
  const [g, setG] = useState(String(a.porcaoG ?? 100).replace('.', ','))
  const gramas = lerNumero(g)
  return (
    <Sheet titulo={a.nome} aoFechar={aoFechar}>
      {semDados(a.por100) && <div className="note warn"><Icon n="info" size={18} /><span>A TACO não traz valores para este alimento. Ele vai entrar com 0 kcal; prefira cadastrar um equivalente na sua base.</span></div>}
      <CampoNumero id="add-g" rotulo={a.medida ? `Quantidade (${a.medida} = ${fa(a.porcaoG)} g)` : 'Quantidade'} unidade="g" valor={g} aoMudar={setG} />
      <div className="chips" role="group" aria-label="Quantidades rápidas">
        {[30, 50, 80, 100, 120, 150, 200].map((x) => <button key={x} type="button" className="chip" aria-pressed={gramas === x} onClick={() => setG(String(x))}>{x} g</button>)}
      </div>
      <TabelaNutrientes a={a} gramas={gramas ?? 0} />
      <button type="button" className="btn primary" disabled={!gramas || gramas <= 0} onClick={() => gramas && aoAdicionar(gramas)}>Adicionar {gramas ? `${fa(gramas)} g` : ''}</button>
    </Sheet>
  )
}

function DetalheSheet({ a, aoFechar }: { a: Alimento; aoFechar: () => void }) {
  return (
    <Sheet titulo={a.nome} aoFechar={aoFechar}>
      <span className="muted" style={{ fontSize: 13 }}>{a.fonte === 'propria' ? `Minha base${a.marca ? ` · ${a.marca}` : ''}` : `TACO #${idTaco(a.ref)} · ${a.categoria}`} · por 100 g</span>
      <TabelaNutrientes a={a} gramas={100} />
      {a.fonte === 'propria' && <Link className="btn" to={`/alimentos/${a.ref.slice(8)}`}>Editar cadastro</Link>}
    </Sheet>
  )
}
