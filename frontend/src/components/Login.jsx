import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Campo from './Campo';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await login(email, senha);
      navigate('/dashboard');
    } catch (err) {
      setErro(err.response?.data?.erro ?? 'Não foi possível conectar ao servidor.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={enviar} style={{ maxWidth: 320, margin: '80px auto', display: 'grid', gap: 12 }}>
      <h1>Entrar</h1>
      {location.state?.sucesso && <p style={{ color: 'green', margin: 0 }}>{location.state.sucesso}</p>}
      <Campo label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Campo label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
      {erro && <p style={{ color: 'crimson', margin: 0 }}>{erro}</p>}
      <button disabled={carregando}>{carregando ? 'Entrando...' : 'Entrar'}</button>
      <p style={{ margin: 0 }}>
        Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
      </p>
    </form>
  );
}