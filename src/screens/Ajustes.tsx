import { useRef, useState } from 'react'
import { TopBar } from '../components/ui'
import { Icon } from '../components/Icon'
import { exportarBackup, importarBackup } from '../lib/db'
import { carregarExemplos, removerExemplos } from '../lib/exemplos'
import { FONTE_TACO } from '../lib/taco'

export default function Ajustes() {
  const arquivo = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  async function baixar() {
    const dados = await exportarBackup()
    const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `macro-z-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg({ ok: true, texto: `Backup com ${dados.pacientes.length} paciente(s) baixado.` })
  }

  async function restaurar(file: File) {
    try {
      await importarBackup(JSON.parse(await file.text()))
      setMsg({ ok: true, texto: 'Backup importado. Registros com o mesmo id foram substituídos.' })
    } catch (e) {
      setMsg({ ok: false, texto: e instanceof Error ? e.message : 'Não foi possível ler o arquivo.' })
    }
  }

  return (
    <main className="page">
      <TopBar voltar="/" titulo="Ajustes" />
      <section className="card">
        <h2 className="sec">Seus dados</h2>
        <span style={{ fontSize: 14, lineHeight: 1.5 }}>Tudo fica salvo só neste aparelho, no navegador. Faça backup com frequência e use o arquivo para passar os dados para outro aparelho.</span>
        <button type="button" className="btn primary" onClick={baixar}><Icon n="baixar" size={18} />Baixar backup</button>
        <button type="button" className="btn" onClick={() => arquivo.current?.click()}>Importar backup</button>
        <input ref={arquivo} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) restaurar(f); e.target.value = '' }} />
        {msg && <div className={msg.ok ? 'note ok' : 'note warn'} role="status"><Icon n={msg.ok ? 'ok' : 'info'} size={18} /><span>{msg.texto}</span></div>}
      </section>
      <section className="card">
        <h2 className="sec">Exemplos</h2>
        <span style={{ fontSize: 14, lineHeight: 1.5 }}>Cria dois pacientes fictícios (Ana Ribeiro e Bruno Tavares) com avaliação, plano completo e manipulados, para conhecer o app. Carregar de novo restaura os exemplos ao estado original.</span>
        <button type="button" className="btn primary" onClick={async () => { await carregarExemplos(); setMsg({ ok: true, texto: 'Pacientes de exemplo carregados.' }) }}>Carregar pacientes de exemplo</button>
        <button type="button" className="btn" onClick={async () => {
          if (!window.confirm('Remover os pacientes de exemplo? Seus pacientes reais não são afetados.')) return
          await removerExemplos(); setMsg({ ok: true, texto: 'Pacientes de exemplo removidos.' })
        }}>Remover exemplos</button>
      </section>
      <section className="card">
        <h2 className="sec">Sobre</h2>
        <span style={{ fontSize: 14, lineHeight: 1.5 }}>Macro Z usa a {FONTE_TACO}, com 597 alimentos. Alimentos fora da tabela podem ser importados do Open Food Facts ou cadastrados à mão.</span>
      </section>
    </main>
  )
}
