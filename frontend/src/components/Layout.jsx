import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const links = [
  ['/dashboard', 'Dashboard'],
  ['/lancamentos', 'Lançamentos'],
  ['/categorias', 'Categorias'],
  ['/fontes-destinos', 'Fontes/Destinos'],
  ['/relatorios', 'Relatórios'],
  ['/faturas', 'Faturas'],
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  return (
    <>
      <header style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid #ddd' }}>
        <strong>Finanças</strong>
        <nav style={{ display: 'flex', gap: 12, flex: 1 }}>
          {links.map(([to, texto]) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })}>
              {texto}
            </NavLink>
          ))}
        </nav>
        <span>{usuario?.nome}</span>
        <button onClick={logout}>Sair</button>
      </header>
      <main style={{ padding: 24 }}>
        <Outlet />
      </main>
    </>
  );
}