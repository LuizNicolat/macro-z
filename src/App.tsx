import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { TabBar } from './components/TabBar'
import { modoApp } from './lib/db'
import Ajustes from './screens/Ajustes'
import Avaliacao from './screens/Avaliacao'
import Buscar from './screens/Buscar'
import Cadastro from './screens/Cadastro'
import Imprimir from './screens/Imprimir'
import Manipulados from './screens/Manipulados'
import Online from './screens/Online'
import PacienteForm from './screens/PacienteForm'
import Pacientes from './screens/Pacientes'
import Plano from './screens/Plano'
import Refeicao from './screens/Refeicao'
import Hoje from './screens/usuario/Hoje'
import Orientacoes from './screens/usuario/Orientacoes'
import Suplementos from './screens/usuario/Suplementos'

/** Página inicial: no modo paciente, vai direto para a dieta dele. */
function Inicio() {
  const m = modoApp()
  return m.tipo === 'paciente' ? <Navigate to={`/u/${m.pid}`} replace /> : <Pacientes />
}

function Shell() {
  const { pathname } = useLocation()
  const impressao = pathname.endsWith('/imprimir')
  return (
    <>
      <div className={impressao ? undefined : 'app'}>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="/paciente/novo" element={<PacienteForm />} />
          <Route path="/paciente/:pid" element={<PacienteForm />} />
          <Route path="/p/:pid" element={<Plano />} />
          <Route path="/p/:pid/r/:rid" element={<Refeicao />} />
          <Route path="/p/:pid/r/:rid/buscar" element={<Buscar />} />
          <Route path="/p/:pid/r/:rid/online" element={<Online />} />
          <Route path="/p/:pid/avaliacao" element={<Avaliacao />} />
          <Route path="/p/:pid/manipulados" element={<Manipulados />} />
          <Route path="/p/:pid/imprimir" element={<Imprimir />} />
          <Route path="/u/:pid" element={<Hoje />} />
          <Route path="/u/:pid/suplementos" element={<Suplementos />} />
          <Route path="/u/:pid/orientacoes" element={<Orientacoes />} />
          <Route path="/alimentos" element={<Buscar />} />
          <Route path="/alimentos/online" element={<Online />} />
          <Route path="/alimentos/novo" element={<Cadastro />} />
          <Route path="/alimentos/:id" element={<Cadastro />} />
          <Route path="*" element={<main className="page"><div className="empty">Página não encontrada.</div></main>} />
        </Routes>
      </div>
      {!impressao && <TabBar />}
    </>
  )
}

/** HashRouter: funciona em qualquer hospedagem estática (GitHub Pages incluso) sem configurar rotas no servidor. */
export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
