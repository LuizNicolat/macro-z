import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Carregando } from '../../components/ui'
import { alterarDiario, db, hojeISO, idDiario } from '../../lib/db'
import { diaCurto, minutos } from '../../lib/datas'
import { useFormulas } from '../../lib/hooks'

/** Suplementos e manipulados do dia, para o paciente marcar o que tomou. */
export default function Suplementos() {
  const { pid = '' } = useParams()
  const data = hojeISO()
  const formulas = useFormulas(pid)
  const diario = useLiveQuery(() => db.diario.get(idDiario(pid, data)), [pid, data], null)

  if (formulas === null || diario === null) return <main className="page"><Carregando /></main>

  const ativas = formulas.filter((f) => f.status !== 'encerrada').sort((a, b) => minutos(a.horario) - minutos(b.horario))
  const tomadas = new Set(diario?.formulas ?? [])
  const alternar = (id: string) =>
    alterarDiario(pid, data, (d) => { d.formulas = d.formulas.includes(id) ? d.formulas.filter((x) => x !== id) : [...d.formulas, id] })

  return (
    <main className="page" style={{ paddingTop: 24 }}>
      <div className="stack" style={{ gap: 2 }}>
        <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Hoje · {diaCurto(data)}</span>
        <h1 className="h1">Suplementos</h1>
        <span className="muted" style={{ fontSize: 13 }}>{tomadas.size} de {ativas.length} tomados</span>
      </div>

      {ativas.length === 0 && <div className="empty muted">Nenhum suplemento ou manipulado no seu plano.</div>}

      <div className="stack">
        {ativas.map((f) => {
          const ok = tomadas.has(f.id)
          return (
            <button key={f.id} type="button" onClick={() => alternar(f.id)} aria-pressed={ok}
              className="card" style={{ padding: 16, gap: 8, borderRadius: 20, textAlign: 'left', font: 'inherit', cursor: 'pointer', borderColor: ok ? 'var(--brand)' : 'var(--line)', background: ok ? '#F7FBF8' : 'var(--surface)' }}>
              <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <span aria-hidden="true" style={{ width: 28, height: 28, flex: 'none', borderRadius: 9, border: ok ? 0 : '2px solid var(--field)', background: ok ? 'var(--brand)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  {ok && <Icon n="ok" size={18} stroke={2.6} />}
                </span>
                <div className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{f.nome}</span>
                  {f.ativos.some((a) => a.nome) && <span className="muted" style={{ fontSize: 13 }}>{f.ativos.filter((a) => a.nome).map((a) => `${a.nome}${a.dose ? ` ${a.dose}` : ''}`).join(' + ')}</span>}
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                    {[f.horario, f.posologia, f.duracao].filter(Boolean).map((x) => <span key={x} className="badge" style={{ fontSize: 12, fontWeight: 600 }}>{x}</span>)}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </main>
  )
}
