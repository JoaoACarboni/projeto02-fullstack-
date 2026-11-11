import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { usuario } = useAuth();
  return <h1>Olá, {usuario?.nome}!</h1>;
}