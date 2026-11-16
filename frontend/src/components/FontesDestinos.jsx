import { useEffect, useState } from 'react';
import { api } from '../services/api';
import Campo from './Campo';

const TIPOS = { renda: 'Renda', conta: 'Conta', cartao_credito: 'Cartão de crédito' };
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const FORM_VAZIO = { nome: '', tipo: 'conta', diaFechamento: '', diaVencimento: '', limite: '' };

// Validação do cliente (complementar: a do servidor é a que vale)
function validar(f) {
  const e = {};
  if (f.nome.trim().length < 2) e.nome = 'O nome deve ter pelo menos 2 caracteres.';
  if (f.tipo === 'cartao_credito') {
    const fechamento = Number(f.diaFechamento);
    const vencimento = Number(f.diaVencimento);
    if (!Number.isInteger(fechamento) || fechamento < 1 || fechamento > 31) {
      e.diaFechamento = 'Informe um dia de 1 a 31.';
    }
    if (!Number.isInteger(vencimento) || vencimento < 1 || vencimento > 31) {
      e.diaVencimento = 'Informe um dia de 1 a 31.';
    }
    if (!(Number(f.limite) > 0)) e.limite = 'Informe um limite maior que zero.';
  }
  return e;
}

export default function FontesDestinos() {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');
  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [erros, setErros] = useState({});
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setErroLista('');
    try {
      const { data } = await api.get('/fontes-destinos');
      setLista(data);
    } catch (err) {
      setErroLista(err.response?.data?.erro ?? 'Não foi possível carregar a lista.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function alterar(campo, valor) {
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function cancelar() {
    setForm(FORM_VAZIO);
    setEditandoId(null);
    setErros({});
  }

  function editar(fonte) {
    setMensagem('');
    setErros({});
    setEditandoId(fonte.id);
    setForm({
      nome: fonte.nome,
      tipo: fonte.tipo,
      diaFechamento: fonte.diaFechamento ?? '',
      diaVencimento: fonte.diaVencimento ?? '',
      limite: fonte.limite ?? '',
    });
  }

  async function salvar(e) {
    e.preventDefault();
    setMensagem('');

    const errosCliente = validar(form);
    setErros(errosCliente);
    if (Object.keys(errosCliente).length) return;

    const payload = { nome: form.nome, tipo: form.tipo };
    if (form.tipo === 'cartao_credito') {
      payload.diaFechamento = Number(form.diaFechamento);
      payload.diaVencimento = Number(form.diaVencimento);
      payload.limite = Number(form.limite);
    }

    setSalvando(true);
    try {
      if (editandoId) {
        await api.put(`/fontes-destinos/${editandoId}`, payload);
      } else {
        await api.post('/fontes-destinos', payload);
      }
      cancelar();
      await carregar();
    } catch (err) {
      const campos = err.response?.data?.campos;
      if (campos) {
        setErros(campos); // mensagens do servidor junto aos campos
      } else {
        setMensagem(err.response?.data?.erro ?? 'Não foi possível salvar.');
      }
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(fonte) {
    if (!window.confirm(`Excluir "${fonte.nome}"?`)) return;
    setMensagem('');
    try {
      await api.delete(`/fontes-destinos/${fonte.id}`);
      if (editandoId === fonte.id) cancelar();
      await carregar();
    } catch (err) {
      setMensagem(err.response?.data?.erro ?? 'Não foi possível excluir.');
    }
  }

  const ehCartao = form.tipo === 'cartao_credito';

  return (
    <div>
      <h1>Fontes e destinos</h1>

      <form onSubmit={salvar} style={{ display: 'grid', gap: 12, maxWidth: 360, marginBottom: 32 }}>
        <h2 style={{ margin: 0 }}>{editandoId ? 'Editar' : 'Novo'}</h2>

        <Campo label="Nome" value={form.nome} onChange={(e) => alterar('nome', e.target.value)} erro={erros.nome} />

        <label style={{ display: 'grid', gap: 4 }}>
          Tipo
          <select
            value={form.tipo}
            onChange={(e) => alterar('tipo', e.target.value)}
            disabled={editandoId !== null}
          >
            {Object.entries(TIPOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
          {erros.tipo && <span style={{ color: 'crimson', fontSize: 14 }}>{erros.tipo}</span>}
        </label>

        {ehCartao && (
          <>
            <Campo
              label="Dia de fechamento"
              type="number"
              min="1"
              max="31"
              value={form.diaFechamento}
              onChange={(e) => alterar('diaFechamento', e.target.value)}
              erro={erros.diaFechamento}
            />
            <Campo
              label="Dia de vencimento"
              type="number"
              min="1"
              max="31"
              value={form.diaVencimento}
              onChange={(e) => alterar('diaVencimento', e.target.value)}
              erro={erros.diaVencimento}
            />
            <Campo
              label="Limite (R$)"
              type="number"
              min="0"
              step="0.01"
              value={form.limite}
              onChange={(e) => alterar('limite', e.target.value)}
              erro={erros.limite}
            />
          </>
        )}

        {mensagem && <p style={{ color: 'crimson', margin: 0 }}>{mensagem}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
          {editandoId && (
            <button type="button" onClick={cancelar}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {carregando && <p>Carregando...</p>}
      {erroLista && <p style={{ color: 'crimson' }}>{erroLista}</p>}
      {!carregando && !erroLista && lista.length === 0 && <p>Nenhuma fonte ou destino cadastrado.</p>}

      {lista.length > 0 && (
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 800 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Fechamento</th>
              <th>Vencimento</th>
              <th>Limite</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{f.nome}</td>
                <td>{TIPOS[f.tipo]}</td>
                <td>{f.diaFechamento ?? '-'}</td>
                <td>{f.diaVencimento ?? '-'}</td>
                <td>{f.limite !== null ? moeda.format(f.limite) : '-'}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => editar(f)}>Editar</button>
                  <button onClick={() => excluir(f)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}