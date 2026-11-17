import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const links = [
  ['/dashboard', 'Dashboard'],
  ['/lancamentos', 'Lançamentos'],
  ['/categorias', 'Categorias'],
  ['/fontes-destinos', 'Fontes/Destinos'],
  ['/relatorios', 'Relatórios'],
  ['/faturas', 'Faturas'],
  ['/saude-financeira', 'Saúde financeira'],
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  return (
    <>
      <header className="topo">
        <strong className="marca">Finanças</strong>
        <nav>
          {links.map(([to, texto]) => (
            <NavLink key={to} to={to}>
              {texto}
            </NavLink>
          ))}
        </nav>
        <div className="usuario">
          <span>{usuario?.nome}</span>
          <button className="secundario" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <main className="conteudo">
        <Outlet />
      </main>
    </>
  );
}
