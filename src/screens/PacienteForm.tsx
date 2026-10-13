import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar } from '../components/ui'
import { agora, criarPaciente, db, excluirPaciente } from '../lib/db'
import { usePaciente } from '../lib/hooks'
import type { Sexo } from '../lib/types'

export default function PacienteForm() {
  const { pid } = useParams()
  const nav = useNavigate()
  const existente = usePaciente(pid)
  const [f, setF] = useState({ nome: '', sexo: 'F' as Sexo, nascimento: '', objetivo: '', telefone: '' })
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (existente) setF({ nome: existente.nome, sexo: existente.sexo, nascimento: existente.nascimento, objetivo: existente.objetivo, telefone: existente.telefone })
  }, [existente])

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) { setErro('Informe o nome do paciente.'); return }
    const dados = { ...f, nome: f.nome.trim(), objetivo: f.objetivo.trim() }
    if (pid) {
      await db.pacientes.update(pid, { ...dados, atualizadoEm: agora() })
      nav(`/p/${pid}`)
    } else {
      const id = await criarPaciente(dados)
      nav(`/p/${id}/avaliacao`)
    }
  }

  async function excluir() {
    if (!pid || !existente) return
    if (!window.confirm(`Excluir ${existente.nome}? O plano, as avaliações e as fórmulas também serão apagados.`)) return
    await excluirPaciente(pid)
    nav('/')
  }

  return (
    <main className="page">
      <TopBar voltar={pid ? `/p/${pid}` : '/'} titulo={pid ? 'Editar paciente' : 'Novo paciente'} />
      <form className="card" onSubmit={salvar} noValidate>
        <div className="field">
          <label htmlFor="pf-nome">Nome da pessoa que vai usar a dieta</label>
          <input id="pf-nome" className="input" autoComplete="off" value={f.nome} onChange={set('nome')} aria-invalid={!!erro} aria-describedby={erro ? 'pf-erro' : undefined} />
          {erro && <span id="pf-erro" style={{ color: 'var(--danger)', fontSize: 13 }}>{erro}</span>}
        </div>
        <div className="field">
          <span className="lbl" id="pf-sexo">Sexo (usado no cálculo do gasto energético)</span>
          <div className="seg" role="group" aria-labelledby="pf-sexo">
            <button type="button" aria-pressed={f.sexo === 'F'} onClick={() => setF({ ...f, sexo: 'F' })}>Feminino</button>
            <button type="button" aria-pressed={f.sexo === 'M'} onClick={() => setF({ ...f, sexo: 'M' })}>Masculino</button>
          </div>
        </div>
        <div className="grid2">
          <div className="field"><label htmlFor="pf-nasc">Nascimento</label><input id="pf-nasc" className="input" type="date" value={f.nascimento} onChange={set('nascimento')} /></div>
          <div className="field"><label htmlFor="pf-tel">Telefone</label><input id="pf-tel" className="input" type="tel" inputMode="tel" value={f.telefone} onChange={set('telefone')} /></div>
        </div>
        <div className="field">
          <label htmlFor="pf-obj">Objetivo</label>
          <input id="pf-obj" className="input" list="objetivos" placeholder="Ex.: Emagrecimento" value={f.objetivo} onChange={set('objetivo')} />
          <datalist id="objetivos">
            <option value="Emagrecimento" /><option value="Hipertrofia" /><option value="Manutenção" /><option value="Recomposição corporal" /><option value="Performance" />
          </datalist>
        </div>
        <button className="btn primary" type="submit">{pid ? 'Salvar' : 'Cadastrar e ir para a avaliação'}</button>
      </form>
      {pid && <button type="button" className="btn danger" onClick={excluir}>Excluir paciente</button>}
    </main>
  )
}
