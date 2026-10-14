import { Link, useLocation } from 'react-router-dom'
import { Icon, type NomeIcone } from './Icon'
import { modoApp, ultimoPaciente } from '../lib/db'

/** Barra inferior. Dieta, Avaliação e Fórmulas abrem o paciente atual (ou o último aberto). */
export function TabBar() {
  const { pathname } = useLocation()
  const u = pathname.match(/^\/u\/([^/]+)/)
  if (u) return <TabBarUsuario pid={u[1]} pathname={pathname} />
  const m = pathname.match(/^\/p\/([^/]+)/)
  const pid = m?.[1] ?? ultimoPaciente()
  const doPaciente = (sufixo: string) => (pid ? `/p/${pid}${sufixo}` : '/')

  const abas: { to: string; n: NomeIcone; rotulo: string; ativo: boolean }[] = [
    { to: modoApp().tipo === 'paciente' ? '/pacientes' : '/', n: 'pessoas', rotulo: 'Pacientes', ativo: pathname === '/' || pathname.startsWith('/paciente') || pathname === '/ajustes' },
    { to: doPaciente(''), n: 'prato', rotulo: 'Dieta', ativo: /^\/p\/[^/]+(\/r\/|\/imprimir|$)/.test(pathname) && !pathname.includes('/buscar') && !pathname.includes('/online') },
    { to: '/alimentos', n: 'busca', rotulo: 'Alimentos', ativo: pathname.startsWith('/alimentos') || pathname.includes('/buscar') || pathname.includes('/online') },
    { to: doPaciente('/avaliacao'), n: 'pulso', rotulo: 'Avaliação', ativo: pathname.endsWith('/avaliacao') },
    { to: doPaciente('/manipulados'), n: 'capsula', rotulo: 'Fórmulas', ativo: pathname.endsWith('/manipulados') },
  ]

  return (
    <div className="tabbar no-print">
      <nav aria-label="Navegação principal">
        {abas.map((a) => (
          <Link key={a.rotulo} to={a.to} className={a.ativo ? 'tab active' : 'tab'} aria-current={a.ativo ? 'page' : undefined}>
            <Icon n={a.n} size={22} />
            <span>{a.rotulo}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

/** Barra do paciente: o dia, os suplementos e as orientações. */
function TabBarUsuario({ pid, pathname }: { pid: string; pathname: string }) {
  const abas: { to: string; n: NomeIcone; rotulo: string; ativo: boolean }[] = [
    { to: `/u/${pid}`, n: 'prato', rotulo: 'Hoje', ativo: pathname === `/u/${pid}` },
    { to: `/u/${pid}/suplementos`, n: 'capsula', rotulo: 'Suplementos', ativo: pathname.endsWith('/suplementos') },
    { to: `/u/${pid}/orientacoes`, n: 'lista', rotulo: 'Orientações', ativo: pathname.endsWith('/orientacoes') },
  ]
  return (
    <div className="tabbar no-print">
      <nav aria-label="Navegação da dieta">
        {abas.map((a) => (
          <Link key={a.rotulo} to={a.to} className={a.ativo ? 'tab active' : 'tab'} aria-current={a.ativo ? 'page' : undefined}>
            <Icon n={a.n} size={22} />
            <span>{a.rotulo}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
