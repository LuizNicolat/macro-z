import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import { distribuicao, f0, f1, pct } from '../lib/nutri'
import type { Meta, Totais } from '../lib/types'

export function TopBar({ voltar, titulo, direita }: { voltar?: string; titulo?: ReactNode; direita?: ReactNode }) {
  return (
    <div className="topbar">
      {voltar ? (
        <Link className="icon-btn" to={voltar} aria-label="Voltar"><Icon n="voltar" stroke={2.2} /></Link>
      ) : <span style={{ width: 44 }} />}
      <span className="title">{titulo}</span>
      {direita ?? <span style={{ width: 44 }} />}
    </div>
  )
}

const CORES_AVATAR = ['#C8F169', '#DCE7FB', '#FCE6C6', '#E6E1F7', '#D7F0E3', '#F7DCE3']

export function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  return ((p[0][0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

export function Avatar({ nome, lg }: { nome: string; lg?: boolean }) {
  let h = 0
  for (const ch of nome) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return <div className={lg ? 'avatar lg' : 'avatar'} style={{ background: CORES_AVATAR[h % CORES_AVATAR.length] }}>{iniciais(nome)}</div>
}

/** Anel com a divisão das calorias entre proteína, carboidrato e gordura. */
export function Donut({ t, meta }: { t: Totais; meta: Meta }) {
  const d = distribuicao(t)
  const C = 2 * Math.PI * 52
  const arcs = [
    { v: d.p, cor: 'var(--p)' },
    { v: d.c, cor: 'var(--c)' },
    { v: d.g, cor: 'var(--g)' },
  ]
  let off = 0
  return (
    <div style={{ position: 'relative', width: 132, height: 132, flex: 'none' }}>
      <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={`Distribuição calórica: proteína ${pct(d.p)}, carboidrato ${pct(d.c)}, gordura ${pct(d.g)}`}>
        <circle cx="66" cy="66" r="52" fill="none" stroke="var(--track)" strokeWidth="16" />
        {arcs.map((a, i) => {
          const el = a.v > 0 ? (
            <circle key={i} cx="66" cy="66" r="52" fill="none" stroke={a.cor} strokeWidth="16"
              strokeDasharray={`${a.v * C} ${C}`} strokeDashoffset={-off * C} transform="rotate(-90 66 66)" />
          ) : null
          off += a.v
          return el
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="num" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{f0(t.kcal)}</span>
        <span className="muted" style={{ fontSize: 11, marginTop: 4 }}>{meta.kcal ? `de ${f0(meta.kcal)} kcal` : 'kcal'}</span>
      </div>
    </div>
  )
}

export function Legenda({ t }: { t: Totais }) {
  const d = distribuicao(t)
  const itens = [
    ['Proteína', d.p, 'var(--p)'],
    ['Carboidrato', d.c, 'var(--c)'],
    ['Gordura', d.g, 'var(--g)'],
  ] as const
  return (
    <div className="stack" style={{ gap: 12, flex: 1 }}>
      {itens.map(([n, v, cor]) => (
        <div key={n} className="row" style={{ gap: 8 }}>
          <span className="dot" style={{ background: cor }} />
          <span style={{ flex: 1, fontSize: 13 }}>{n}</span>
          <span className="num" style={{ fontWeight: 600 }}>{pct(v)}</span>
        </div>
      ))}
    </div>
  )
}

export function BarraMeta({ rotulo, valor, meta, cor, extra }: { rotulo: string; valor: number; meta: number; cor: string; extra?: string }) {
  const w = meta > 0 ? Math.min(100, (valor / meta) * 100) : 0
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="between" style={{ fontSize: 13 }}>
        <span style={{ fontWeight: 600 }}>{rotulo}</span>
        <span className="num"><b>{f1(valor)}</b>{meta > 0 ? ` / ${f0(meta)} g` : ' g'}{extra ? ` · ${extra}` : ''}</span>
      </div>
      <div className="bar"><div style={{ width: `${w}%`, background: cor }} /></div>
    </div>
  )
}

export function MacroLinha({ t }: { t: Totais }) {
  return <span className="num" style={{ fontSize: 12 }}>P {f1(t.p)} · C {f1(t.c)} · G {f1(t.g)}</span>
}

export function Sheet({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    el?.querySelector<HTMLElement>('input, select, textarea, button')?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar() }
    el?.addEventListener('keydown', esc)
    return () => el?.removeEventListener('keydown', esc)
  }, [aoFechar])
  return (
    <div className="sheet-back" onClick={(e) => { if (e.target === e.currentTarget) aoFechar() }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <div className="between">
          <span style={{ fontSize: 18, fontWeight: 700 }}>{titulo}</span>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={aoFechar}><Icon n="fechar" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Campo numérico que aceita vírgula e só confirma o valor quando é válido. */
export function CampoNumero({ id, rotulo, valor, aoMudar, unidade, cor, passo }: {
  id: string; rotulo: string; valor: string; aoMudar: (s: string) => void; unidade?: string; cor?: string; passo?: string
}) {
  return (
    <div className="field">
      <label htmlFor={id} style={cor ? { color: cor } : undefined}>{rotulo}</label>
      <div className="unit">
        <input id={id} className="input num" inputMode="decimal" value={valor} step={passo} onChange={(e) => aoMudar(e.target.value)} />
        {unidade && <span>{unidade}</span>}
      </div>
    </div>
  )
}

export function useToast() {
  const [msg, setMsg] = useState('')
  const t = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(t.current), [])
  const mostrar = (m: string) => {
    setMsg(m)
    window.clearTimeout(t.current)
    t.current = window.setTimeout(() => setMsg(''), 2400)
  }
  const el = msg ? <div className="toast" role="status"><Icon n="ok" size={18} stroke={2.4} /><span style={{ flex: 1 }}>{msg}</span></div> : null
  return { mostrar, el }
}

export function Carregando() {
  return <div className="empty muted">Carregando…</div>
}
