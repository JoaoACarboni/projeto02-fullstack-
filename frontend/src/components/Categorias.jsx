import { useEffect, useState } from 'react';
import { api } from '../services/api';
import Campo from './Campo';

const FORM_VAZIO = { nome: '', tipo: 'saida' };
const estiloErro = { color: 'crimson', fontSize: 14 };

// Validação do cliente (complementar: a do servidor é a que vale)
function validar(f) {
  const e = {};
  const tamanho = f.nome.trim().length;
  if (tamanho < 2 || tamanho > 60) e.nome = 'O nome deve ter entre 2 e 60 caracteres.';
  return e;
}

function Secao({ titulo, itens, onEditar, onExcluir }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2>{titulo}</h2>
      {itens.length === 0 ? (
        <p>Nenhuma categoria.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', minWidth: 360 }}>
          <tbody>
            {itens.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8, width: 220 }}>{c.nome}</td>
                <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                  <button onClick={() => onEditar(c)}>Editar</button>
                  <button onClick={() => onExcluir(c)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function Categorias() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');
  const [erroAcao, setErroAcao] = useState('');

  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    try {
      const { data } = await api.get('/categorias');
      setItens(Array.isArray(data) ? data : []);
      setErroLista('');
    } catch (err) {
      setErroLista(err.response?.data?.erro ?? 'Não foi possível carregar as categorias.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function alterar(campo, valor) {
    setForm((anterior) => ({ ...anterior, [campo]: valor }));
    setErros((anterior) => ({ ...anterior, [campo]: undefined }));
  }

  function cancelar() {
    setForm(FORM_VAZIO);
    setEditandoId(null);
    setErros({});
    setErroGeral('');
  }

  function editar(item) {
    setErroAcao('');
    setErros({});
    setErroGeral('');
    setEditandoId(item.id);
    setForm({ nome: item.nome, tipo: item.tipo });
  }

  async function enviar(e) {
    e.preventDefault();
    setErroGeral('');
    setErroAcao('');

    const errosCliente = validar(form);
    setErros(errosCliente);
    if (Object.keys(errosCliente).length) return;

    setSalvando(true);
    try {
      if (editandoId) await api.put(`/categorias/${editandoId}`, { nome: form.nome });
      else await api.post('/categorias', { nome: form.nome, tipo: form.tipo });
      cancelar();
      await carregar();
    } catch (err) {
      const campos = err.response?.data?.campos;
      if (campos) setErros(campos); // 400 e 409: mensagem junto ao campo
      else setErroGeral(err.response?.data?.erro ?? 'Não foi possível conectar ao servidor.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(item) {
    if (!window.confirm(`Excluir a categoria "${item.nome}"?`)) return;
    setErroAcao('');
    try {
      await api.delete(`/categorias/${item.id}`);
      if (editandoId === item.id) cancelar();
      await carregar();
    } catch (err) {
      // 409: categoria com lançamentos associados
      setErroAcao(err.response?.data?.erro ?? 'Não foi possível excluir.');
    }
  }

  const ordenadas = [...itens].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const entradas = ordenadas.filter((c) => c.tipo === 'entrada');
  const saidas = ordenadas.filter((c) => c.tipo === 'saida');

  return (
    <div>
      <h1>Categorias</h1>

      <form onSubmit={enviar} style={{ display: 'grid', gap: 12, maxWidth: 360, marginBottom: 32 }}>
        <h2 style={{ margin: 0 }}>{editandoId ? 'Editar categoria' : 'Nova categoria'}</h2>

        <Campo label="Nome" value={form.nome} onChange={(e) => alterar('nome', e.target.value)} erro={erros.nome} />

        <label style={{ display: 'grid', gap: 4 }}>
          Tipo
          <select
            value={form.tipo}
            onChange={(e) => alterar('tipo', e.target.value)}
            disabled={editandoId !== null}
          >
            <option value="saida">Saída</option>
            <option value="entrada">Entrada</option>
          </select>
          {editandoId && <small>O tipo não pode ser alterado depois de criada.</small>}
          {erros.tipo && <span style={estiloErro}>{erros.tipo}</span>}
        </label>

        {erroGeral && <p style={{ ...estiloErro, margin: 0 }}>{erroGeral}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={salvando}>{salvando ? 'Salvando...' : editandoId ? 'Salvar' : 'Adicionar'}</button>
          {editandoId && (
            <button type="button" onClick={cancelar}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {erroAcao && <p style={estiloErro}>{erroAcao}</p>}

      {carregando ? (
        <p>Carregando...</p>
      ) : erroLista ? (
        <p style={estiloErro}>{erroLista}</p>
      ) : (
        <>
          <Secao titulo="Entradas" itens={entradas} onEditar={editar} onExcluir={excluir} />
          <Secao titulo="Saídas" itens={saidas} onEditar={editar} onExcluir={excluir} />
        </>
      )}
    </div>
  );
}