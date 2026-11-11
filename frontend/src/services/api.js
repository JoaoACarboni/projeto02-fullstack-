import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
});

// Envia o token em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token expirado ou inválido: encerra a sessão e volta ao login
api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    // Só derruba a sessão se havia token (o 401 do próprio login não entra aqui)
    if (erro.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(erro);
  }
);