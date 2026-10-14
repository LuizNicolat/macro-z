import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/ui'
import { Icon } from '../components/Icon'
import { baixarJson, db, definirModo, exportarBackup, importarBackup, modoApp } from '../lib/db'
import { carregarExemplos, removerExemplos } from '../lib/exemplos'
import { FONTE_TACO } from '../lib/taco'

export default function Ajustes() {
  const nav = useNavigate()
  const arquivo = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [modo, setModo] = useState(modoApp())
  const pacientes = useLiveQuery(() => db.pacientes.orderBy('nome').toArray(), [], [])
  const voltar = modo.tipo === 'paciente' ? `/u/${modo.pid}` : '/'

  async function baixar() {
    const dados = await exportarBackup()
    baixarJson(dados, `macro-z-backup-${new Date().toISOString().slice(0, 10)}.json`)
    setMsg({ ok: true, texto: `Backup com ${dados.pacientes.length} paciente(s) baixado.` })
  }

  async function restaurar(file: File) {
    try {
      const abrir = await importarBackup(JSON.parse(await file.text()))
      if (abrir) { nav(`/u/${abrir}`); return }
      setMsg({ ok: true, texto: 'Backup importado. Registros com o mesmo id foram substituídos.' })
    } catch (e) {
      setMsg({ ok: false, texto: e instanceof Error ? e.message : 'Não foi possível ler o arquivo.' })
    }
  }

  function trocarModo(pid: string | null) {
    const m = pid ? { tipo: 'paciente' as const, pid } : { tipo: 'profissional' as const }
    definirModo(m)
    setModo(m)
    nav(pid ? `/u/${pid}` : '/')
  }

  return (
    <main className="page">
      <TopBar voltar={voltar} titulo="Ajustes" />

      <section className="card">
        <h2 className="sec">Como usar este aparelho</h2>
        <span style={{ fontSize: 14, lineHeight: 1.5 }}>No modo <b>paciente</b>, o app abre direto na dieta da pessoa, com as refeições do dia para marcar. No modo <b>profissional</b>, mostra a lista de pacientes e a edição dos planos.</span>
        <div className="seg" role="group" aria-label="Modo do aparelho">
          <button type="button" aria-pressed={modo.tipo === 'profissional'} onClick={() => trocarModo(null)}>Profissional</button>
          <button type="button" aria-pressed={modo.tipo === 'paciente'} disabled={!pacientes.length}
            onClick={() => pacientes[0] && trocarModo(modo.tipo === 'paciente' ? modo.pid : pacientes[0].id)}>Paciente</button>
        </div>
        {modo.tipo === 'paciente' && pacientes.length > 1 && (
          <div className="field">
            <label htmlFor="aj-pac">Dieta de</label>
            <select id="aj-pac" className="input" value={modo.pid} onChange={(e) => trocarModo(e.target.value)}>
              {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="sec">Seus dados</h2>
        <span style={{ fontSize: 14, lineHeight: 1.5 }}>Tudo fica salvo só neste aparelho, no navegador. Faça backup com frequência e use o arquivo para passar os dados para outro aparelho. Arquivos de dieta enviados pelo profissional também entram por aqui.</span>
        <button type="button" className="btn primary" onClick={baixar}><Icon n="baixar" size={18} />Baixar backup</button>
        <button type="button" className="btn" onClick={() => arquivo.current?.click()}>Importar backup ou dieta</button>
        <input ref={arquivo} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) restaurar(f); e.target.value = '' }} />
        {msg && <div className={msg.ok ? 'note ok' : 'note warn'} role="status"><Icon n={msg.ok ? 'ok' : 'info'} size={18} /><span>{msg.texto}</span></div>}
      </section>

      {modo.tipo === 'profissional' && (
        <section className="card">
          <h2 className="sec">Exemplos</h2>
          <span style={{ fontSize: 14, lineHeight: 1.5 }}>Cria dois pacientes fictícios (Ana Ribeiro e Bruno Tavares) com avaliação, plano completo e manipulados, para conhecer o app. Carregar de novo restaura os exemplos ao estado original.</span>
          <button type="button" className="btn primary" onClick={async () => { await carregarExemplos(); setMsg({ ok: true, texto: 'Pacientes de exemplo carregados.' }) }}>Carregar pacientes de exemplo</button>
          <button type="button" className="btn" onClick={async () => {
            if (!window.confirm('Remover os pacientes de exemplo? Seus pacientes reais não são afetados.')) return
            await removerExemplos(); setMsg({ ok: true, texto: 'Pacientes de exemplo removidos.' })
          }}>Remover exemplos</button>
        </section>
      )}

      <section className="card">
        <h2 className="sec">Sobre</h2>
        <span style={{ fontSize: 14, lineHeight: 1.5 }}>Macro Z usa a {FONTE_TACO}, com 597 alimentos. Alimentos fora da tabela podem ser importados do Open Food Facts ou cadastrados à mão.</span>
      </section>
    </main>
  )
}
