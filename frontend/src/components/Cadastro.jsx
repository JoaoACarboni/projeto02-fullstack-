import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Campo from './Campo';

function mascararCpf(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// Validação do cliente (complementar: a do servidor é a que vale)
function validar(d) {
  const e = {};
  if (!d.nome.trim()) e.nome = 'Informe o nome.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email = 'E-mail inválido.';
  if (d.cpf.replace(/\D/g, '').length !== 11) e.cpf = 'O CPF deve ter 11 dígitos.';
  if (d.senha.length < 8 || !/[A-Za-z]/.test(d.senha) || !/\d/.test(d.senha)) {
    e.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
  }
  if (d.senha !== d.confirmarSenha) e.confirmarSenha = 'As senhas não conferem.';
  return e;
}

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const navigate = useNavigate();
  const [dados, setDados] = useState({ nome: '', email: '', cpf: '', senha: '', confirmarSenha: '' });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [carregando, setCarregando] = useState(false);

  function alterar(campo, valor) {
    setDados((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function enviar(e) {
    e.preventDefault();
    setErroGeral('');

    const errosCliente = validar(dados);
    setErros(errosCliente);
    if (Object.keys(errosCliente).length) return;

    setCarregando(true);
    try {
      await cadastrar({ nome: dados.nome, email: dados.email, cpf: dados.cpf, senha: dados.senha });
      navigate('/login', { state: { sucesso: 'Cadastro realizado! Faça login para continuar.' } });
    } catch (err) {
      const campos = err.response?.data?.campos;
      if (campos) {
        setErros(campos); // mensagens do servidor junto ao campo (400 e 409)
      } else {
        setErroGeral(err.response?.data?.erro ?? 'Não foi possível conectar ao servidor.');
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={enviar} style={{ maxWidth: 340, margin: '60px auto', display: 'grid', gap: 12 }}>
      <h1>Criar conta</h1>
      <Campo label="Nome" value={dados.nome} onChange={(e) => alterar('nome', e.target.value)} erro={erros.nome} />
      <Campo label="E-mail" type="email" value={dados.email} onChange={(e) => alterar('email', e.target.value)} erro={erros.email} />
      <Campo
        label="CPF"
        value={dados.cpf}
        onChange={(e) => alterar('cpf', mascararCpf(e.target.value))}
        placeholder="000.000.000-00"
        erro={erros.cpf}
      />
      <Campo label="Senha" type="password" value={dados.senha} onChange={(e) => alterar('senha', e.target.value)} erro={erros.senha} />
      <Campo
        label="Confirmar senha"
        type="password"
        value={dados.confirmarSenha}
        onChange={(e) => alterar('confirmarSenha', e.target.value)}
        erro={erros.confirmarSenha}
      />
      {erroGeral && <p style={{ color: 'crimson', margin: 0 }}>{erroGeral}</p>}
      <button disabled={carregando}>{carregando ? 'Cadastrando...' : 'Cadastrar'}</button>
      <p style={{ margin: 0 }}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </form>
  );
}