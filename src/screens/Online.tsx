import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/ui'
import { fa, f0 } from '../lib/nutri'
import { buscarCodigoOFF, buscarOFF, type ProdutoOFF } from '../lib/off'

/** Busca em bases públicas de rótulos (Open Food Facts) quando o alimento não está na TACO. */
export default function Online() {
  const { pid, rid } = useParams()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const [modo, setModo] = useState<'nome' | 'codigo'>('nome')
  const [termo, setTermo] = useState(sp.get('q') ?? '')
  const [codigo, setCodigo] = useState('')
  const [estado, setEstado] = useState<{ carregando: boolean; erro: string; res: ProdutoOFF[] | null }>({ carregando: false, erro: '', res: null })

  const voltar = pid && rid ? `/p/${pid}/r/${rid}/buscar?q=${encodeURIComponent(sp.get('q') ?? '')}` : `/alimentos?q=${encodeURIComponent(sp.get('q') ?? '')}`

  async function buscar(e?: React.FormEvent) {
    e?.preventDefault()
    const ctl = new AbortController()
    const tempo = window.setTimeout(() => ctl.abort(), 15000)
    setEstado({ carregando: true, erro: '', res: null })
    try {
      if (modo === 'nome') {
        if (!termo.trim()) { setEstado({ carregando: false, erro: '', res: null }); return }
        setEstado({ carregando: false, erro: '', res: await buscarOFF(termo.trim(), ctl.signal) })
      } else {
        const p = await buscarCodigoOFF(codigo, ctl.signal)
        setEstado({ carregando: false, erro: p ? '' : 'Nenhum produto com esse código de barras.', res: p ? [p] : [] })
      }
    } catch {
      setEstado({ carregando: false, erro: navigator.onLine ? 'Não foi possível consultar o Open Food Facts agora. Tente de novo ou cadastre manualmente.' : 'Sem internet. A busca online precisa de conexão; a TACO continua funcionando offline.', res: null })
    } finally {
      window.clearTimeout(tempo)
    }
  }

  useEffect(() => { if (termo.trim()) buscar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const importar = (p: ProdutoOFF) => {
    const qs = new URLSearchParams()
    if (pid && rid) { qs.set('p', pid); qs.set('r', rid); if (sp.get('op')) qs.set('op', sp.get('op')!) }
    nav(`/alimentos/novo?${qs}`, { state: { off: p } })
  }

  const linkCadastro = `/alimentos/novo?${new URLSearchParams({ ...(pid && rid ? { p: pid, r: rid, ...(sp.get('op') ? { op: sp.get('op')! } : {}) } : {}), nome: termo })}`

  return (
    <main className="page">
      <TopBar voltar={voltar} titulo="Buscar em outras fontes" />

      <div className="note warn"><Icon n="info" size={18} /><span>Dados de rótulos enviados por usuários do Open Food Facts. Confira com a embalagem antes de salvar: você revisa tudo na próxima tela.</span></div>

      <div className="seg" role="group" aria-label="Tipo de busca">
        <button type="button" aria-pressed={modo === 'nome'} onClick={() => setModo('nome')}>Por nome</button>
        <button type="button" aria-pressed={modo === 'codigo'} onClick={() => setModo('codigo')}>Código de barras</button>
      </div>

      <form onSubmit={buscar} className="row" style={{ gap: 8 }}>
        {modo === 'nome' ? (
          <div className="search" style={{ flex: 1 }}>
            <label htmlFor="qe" className="sr-only">Nome do produto</label>
            <Icon n="busca" size={18} />
            <input id="qe" className="input" type="search" placeholder="Ex.: whey protein" value={termo} onChange={(e) => setTermo(e.target.value)} />
          </div>
        ) : (
          <div className="search" style={{ flex: 1 }}>
            <label htmlFor="ce" className="sr-only">Código de barras</label>
            <Icon n="codigo" size={18} />
            <input id="ce" className="input num" inputMode="numeric" placeholder="Número embaixo do código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
        )}
        <button className="btn primary sm" type="submit" style={{ minHeight: 50 }}>Buscar</button>
      </form>

      {estado.carregando && <div className="empty muted">Consultando o Open Food Facts…</div>}
      {estado.erro && <div className="note warn"><Icon n="info" size={18} /><span>{estado.erro}</span></div>}
      {estado.res && estado.res.length === 0 && !estado.erro && <div className="empty muted">Nenhum produto encontrado.</div>}

      <div className="stack" style={{ gap: 10 }}>
        {estado.res?.map((p) => (
          <div key={p.codigo + p.nome} className="card" style={{ padding: 14, gap: 10, borderRadius: 18 }}>
            <div className="between" style={{ alignItems: 'flex-start' }}>
              <div className="stack" style={{ gap: 3, minWidth: 0 }}>
                <span style={{ fontWeight: 700 }}>{p.nome}</span>
                <span className="muted" style={{ fontSize: 12 }}>{[p.marca, p.porcao && `porção ${p.porcao}`].filter(Boolean).join(' · ') || 'Sem marca informada'}</span>
              </div>
              <span className="num" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{p.por100.kcal == null ? '—' : `${f0(p.por100.kcal)} kcal`}</span>
            </div>
            <div className="between">
              <span className="num" style={{ fontSize: 13 }}>100 g: P {fa(p.por100.p)} · C {fa(p.por100.c)} · G {fa(p.por100.g)}</span>
              <button type="button" className="btn primary sm" onClick={() => importar(p)}>Importar</button>
            </div>
          </div>
        ))}
      </div>

      <Link to={linkCadastro} className="tile" style={{ background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' }}>
        <div className="icon-btn" style={{ background: 'var(--lime)', border: 0, color: 'var(--ink)' }}><Icon n="lapis" /></div>
        <div className="stack" style={{ flex: 1, gap: 2 }}>
          <span style={{ fontWeight: 700 }}>Cadastrar manualmente</span>
          <span style={{ fontSize: 12, color: 'var(--dark-muted)' }}>Digite os valores do rótulo ou de outra tabela</span>
        </div>
        <Icon n="seta" />
      </Link>
    </main>
  )
}
