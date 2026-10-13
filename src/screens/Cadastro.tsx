import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { CampoNumero, TopBar } from '../components/ui'
import { agora, alterarPlano, db, uid } from '../lib/db'
import { proprioParaAlimento } from '../lib/hooks'
import { f1, fa, f0, kcalPorMacros, lerNumero, numParaCampo } from '../lib/nutri'
import type { ProdutoOFF } from '../lib/off'
import type { AlimentoProprio, FonteProprio, Nutrientes } from '../lib/types'

const FONTES: { k: FonteProprio; rotulo: string }[] = [
  { k: 'rotulo', rotulo: 'Rótulo' },
  { k: 'outra_tabela', rotulo: 'Outra tabela' },
  { k: 'propria', rotulo: 'Avaliação própria' },
  { k: 'open_food_facts', rotulo: 'Open Food Facts' },
]

const CATEGORIAS = ['Suplementos', 'Industrializados', 'Receitas', 'Carnes', 'Cereais', 'Frutas', 'Verduras', 'Laticínios', 'Bebidas', 'Outros']

type Campos = { nome: string; marca: string; categoria: string; porcao: string; medida: string; kcal: string; p: string; c: string; g: string; fibra: string; sodio: string; fonte: FonteProprio; codigo: string }

const vazio: Campos = { nome: '', marca: '', categoria: 'Suplementos', porcao: '100', medida: '', kcal: '', p: '', c: '', g: '', fibra: '', sodio: '', fonte: 'rotulo', codigo: '' }

/** Converte valores por 100 g para a porção, arredondando para exibir no formulário. */
function porPorcao(por100: Nutrientes, porcao: number): Pick<Campos, 'kcal' | 'p' | 'c' | 'g' | 'fibra' | 'sodio'> {
  const k = porcao / 100
  const r = (x: number | null, d = 1) => (x == null ? '' : numParaCampo(Math.round(x * k * 10 ** d) / 10 ** d))
  return { kcal: r(por100.kcal, 0), p: r(por100.p), c: r(por100.c), g: r(por100.g), fibra: r(por100.fibra), sodio: r(por100.sodio, 0) }
}

export default function Cadastro() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const { state } = useLocation() as { state: { off?: ProdutoOFF } | null }
  const nav = useNavigate()
  const pid = sp.get('p'), rid = sp.get('r')
  const existente = useLiveQuery(() => (id ? db.alimentos.get(id) : undefined), [id])
  const [f, setF] = useState<Campos>(() => {
    const off = state?.off
    if (off) {
      const porcao = off.porcaoG && off.porcaoG > 0 ? off.porcaoG : 100
      return { ...vazio, nome: off.nome, marca: off.marca, porcao: numParaCampo(porcao), fonte: 'open_food_facts', codigo: off.codigo, ...porPorcao(off.por100, porcao) }
    }
    return { ...vazio, nome: sp.get('nome') ?? '' }
  })
  const [reutilizar, setReutilizar] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!existente) return
    setF({ nome: existente.nome, marca: existente.marca, categoria: existente.categoria, porcao: numParaCampo(existente.porcaoG), medida: existente.medida,
      fonte: existente.fonte, codigo: existente.codigoBarras, ...porPorcao(existente.por100, existente.porcaoG) })
  }, [existente])

  const set = (k: keyof Campos) => (s: string) => setF((x) => ({ ...x, [k]: s }))
  const n = (s: string) => lerNumero(s)
  const porcao = n(f.porcao) ?? 0
  const calc = kcalPorMacros(n(f.p) ?? 0, n(f.c) ?? 0, n(f.g) ?? 0)
  const kcal = n(f.kcal)
  const diff = kcal ? Math.abs(calc - kcal) / kcal : 0
  const confere = !kcal || diff <= 0.08
  const k100 = porcao > 0 ? 100 / porcao : 0
  const para100 = (x: number | null) => (x == null ? null : Math.round(x * k100 * 100) / 100)
  const por100: Nutrientes = { kcal: para100(kcal ?? (calc || null)), p: para100(n(f.p)), c: para100(n(f.c)), g: para100(n(f.g)), fibra: para100(n(f.fibra)), sodio: para100(n(f.sodio)) }

  async function salvar() {
    if (!f.nome.trim()) { setErro('Dê um nome ao alimento.'); return }
    if (!(porcao > 0)) { setErro('Informe a porção base em gramas.'); return }
    if (por100.kcal == null && por100.p == null && por100.c == null && por100.g == null) { setErro('Preencha pelo menos a energia ou os macros.'); return }
    const reg: AlimentoProprio = {
      id: id ?? uid(), nome: f.nome.trim(), marca: f.marca.trim(), categoria: f.categoria, porcaoG: porcao, medida: f.medida.trim(),
      fonte: f.fonte, codigoBarras: f.codigo, por100, criadoEm: existente?.criadoEm ?? agora(),
    }
    const alimento = proprioParaAlimento(reg)
    if (reutilizar || id) await db.alimentos.put(reg)
    if (pid && rid) {
      await alterarPlano(pid, (p) => {
        p.refeicoes.find((r) => r.id === rid)?.itens.push({ id: uid(), ref: alimento.ref, nome: alimento.nome, fonte: 'propria', por100, gramas: porcao })
      })
      nav(`/p/${pid}/r/${rid}`)
    } else {
      nav(`/alimentos?q=${encodeURIComponent(reg.nome)}`)
    }
  }

  async function excluir() {
    if (!id || !window.confirm('Excluir este alimento da sua base? Planos que já usam ele não mudam.')) return
    await db.alimentos.delete(id)
    nav('/alimentos')
  }

  return (
    <main className="page">
      <TopBar voltar={pid && rid ? `/p/${pid}/r/${rid}/buscar` : '/alimentos'} titulo={id ? 'Editar alimento' : 'Cadastro manual'} />

      <section className="card" aria-labelledby="t-id">
        <h2 id="t-id" className="sec">Identificação</h2>
        <div className="field">
          <label htmlFor="c-nome">Nome do alimento</label>
          <input id="c-nome" className="input" value={f.nome} onChange={(e) => set('nome')(e.target.value)} aria-invalid={!!erro && !f.nome.trim()} />
        </div>
        <div className="field"><label htmlFor="c-marca">Marca (opcional)</label><input id="c-marca" className="input" value={f.marca} onChange={(e) => set('marca')(e.target.value)} /></div>
        <div className="field">
          <label htmlFor="c-cat">Categoria</label>
          <select id="c-cat" className="input" value={f.categoria} onChange={(e) => set('categoria')(e.target.value)}>
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid2">
          <CampoNumero id="c-porcao" rotulo="Porção base" unidade="g" valor={f.porcao} aoMudar={set('porcao')} />
          <div className="field"><label htmlFor="c-medida">Medida caseira</label><input id="c-medida" className="input" placeholder="Ex.: 1 scoop" value={f.medida} onChange={(e) => set('medida')(e.target.value)} /></div>
        </div>
        <div className="field">
          <span className="lbl" id="c-fonte">Fonte dos dados</span>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }} role="group" aria-labelledby="c-fonte">
            {FONTES.map((x) => <button key={x.k} type="button" className="chip" aria-pressed={f.fonte === x.k} onClick={() => setF({ ...f, fonte: x.k })}>{x.rotulo}</button>)}
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="t-nut">
        <h2 id="t-nut" className="sec">Informação nutricional · por porção</h2>
        <CampoNumero id="c-kcal" rotulo="Energia" unidade="kcal" valor={f.kcal} aoMudar={set('kcal')} />
        <div className="grid3">
          <CampoNumero id="c-p" rotulo="Proteína" unidade="g" cor="var(--p-text)" valor={f.p} aoMudar={set('p')} />
          <CampoNumero id="c-c" rotulo="Carboidrato" unidade="g" cor="var(--c-text)" valor={f.c} aoMudar={set('c')} />
          <CampoNumero id="c-g" rotulo="Gordura" unidade="g" cor="var(--g-text)" valor={f.g} aoMudar={set('g')} />
        </div>
        <div className="grid2">
          <CampoNumero id="c-fib" rotulo="Fibra" unidade="g" valor={f.fibra} aoMudar={set('fibra')} />
          <CampoNumero id="c-sod" rotulo="Sódio" unidade="mg" valor={f.sodio} aoMudar={set('sodio')} />
        </div>
        <div className={confere ? 'note ok' : 'note warn'}>
          <Icon n={confere ? 'ok' : 'info'} size={18} stroke={2.2} />
          <span>Pelos macros: <b className="num">{f1(calc)} kcal</b> (4·P + 4·C + 9·G). {kcal ? (confere ? 'Confere com a energia informada.' : 'Diferença acima de 8%: revise o rótulo.') : 'Sem energia informada, este valor será usado.'}</span>
        </div>
      </section>

      <section className="card dark" aria-label="Equivalente por 100 g" style={{ gap: 10 }}>
        <span className="sec">Salvo na base como · por 100 g</span>
        <div className="grid4">
          {([[por100.kcal, 'kcal', true], [por100.p, 'prot. g'], [por100.c, 'carb. g'], [por100.g, 'gord. g']] as const).map(([x, r, int], i) => (
            <div key={i} className="stack" style={{ gap: 2 }}>
              <span className="num" style={{ fontSize: 18, fontWeight: 700 }}>{x == null ? '—' : int ? f0(x) : fa(Math.round(x * 10) / 10)}</span>
              <span style={{ fontSize: 11, color: 'var(--dark-muted)' }}>{r}</span>
            </div>
          ))}
        </div>
      </section>

      {!id && (
        <label className="check">
          <input type="checkbox" checked={reutilizar} onChange={(e) => setReutilizar(e.target.checked)} />
          Salvar na minha base para reutilizar em outros planos
        </label>
      )}

      {erro && <div className="note warn" role="alert"><Icon n="info" size={18} /><span>{erro}</span></div>}

      <div className="grid2">
        <button type="button" className="btn" onClick={() => nav(-1)}>Cancelar</button>
        <button type="button" className="btn primary" onClick={salvar}>{pid && rid ? 'Salvar e adicionar' : 'Salvar alimento'}</button>
      </div>
      {id && <button type="button" className="btn danger" onClick={excluir}>Excluir da base</button>}
    </main>
  )
}
