import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

// Lê a expiração (exp, em segundos) do payload do JWT. Não valida a assinatura:
// isso é papel do servidor; aqui só serve para saber quando encerrar a sessão.
function expiracaoDoToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return 0; // token ilegível: trata como expirado
  }
}

function tokenSalvoValido() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const exp = expiracaoDoToken(token);
  if (exp !== null && exp <= Date.now()) {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    return null;
  }
  return token;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(tokenSalvoValido);
  const [usuario, setUsuario] = useState(() => {
    const salvo = localStorage.getItem('usuario');
    return salvo && localStorage.getItem('token') ? JSON.parse(salvo) : null;
  });

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  }, []);

  // Encerra a sessão automaticamente quando o token expira (a RotaProtegida
  // então leva o usuário ao login). O interceptor do api.js cobre o caso de
  // a API responder 401 antes disso.
  useEffect(() => {
    if (!token) return undefined;
    const exp = expiracaoDoToken(token);
    if (exp === null) return undefined;
    const id = setTimeout(logout, Math.max(exp - Date.now(), 0));
    return () => clearTimeout(id);
  }, [token, logout]);

  async function login(email, senha) {
    const { data } = await api.post('/auth/login', { email, senha });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setToken(data.token);
    setUsuario(data.usuario);
  }

  async function cadastrar(dados) {
    await api.post('/auth/cadastro', dados);
  }

  return (
    <AuthContext.Provider value={{ token, usuario, login, logout, cadastrar }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
