import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import Campo from './Campo';

const reais = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
const dataBR = (iso) => iso.split('-').reverse().join('/');
const pad = (n) => String(n).padStart(2, '0');
const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function mesCorrente() {
  const h = new Date();
  return {
    inicio: isoDe(new Date(h.getFullYear(), h.getMonth(), 1)),
    fim: isoDe(new Date(h.getFullYear(), h.getMonth() + 1, 0)),
  };
}

const formVazio = () => ({
  tipo: 'saida',
  descricao: '',
  valor: '',
  data: isoDe(new Date()),
  categoriaId: '',
  fonteDestinoId: '',
});

// Validação do cliente (complementar: a do servidor é a que vale)
function validar(f) {
  const e = {};
  if (!f.descricao.trim()) e.descricao = 'Informe a descrição.';
  if (!(Number(f.valor) > 0)) e.valor = 'O valor deve ser maior que zero.';
  if (!f.data) e.data = 'Informe a data.';
  if (!f.categoriaId) e.categoriaId = 'Escolha a categoria.';
  if (!f.fonteDestinoId) e.fonteDestinoId = 'Escolha a fonte/destino.';
  return e;
}

const estiloErro = { color: 'crimson', fontSize: 14 };

export default function Lancamentos() {
  const [categorias, setCategorias] = useState([]);
  const [fontes, setFontes] = useState([]);

  const [filtros, setFiltros] = useState(() => ({
    ...mesCorrente(),
    tipo: '',
    categoriaId: '',
    fonteDestinoId: '',
  }));
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');
  const [erroAcao, setErroAcao] = useState('');

  const [form, setForm] = useState(formVazio);
  const [editandoId, setEditandoId] = useState(null);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Categorias e fontes/destinos para os selects
  useEffect(() => {
    async function carregarApoio() {
      try {
        const [c, f] = await Promise.all([api.get('/categorias'), api.get('/fontes-destinos')]);
        setCategorias(c.data);
        setFontes(f.data);
      } catch (err) {
        setErroLista(err.response?.data?.erro ?? 'Não foi possível carregar categorias e fontes.');
      }
    }
    carregarApoio();
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = { pagina };
      for (const [chave, valor] of Object.entries(filtros)) if (valor) params[chave] = valor;
      const { data } = await api.get('/lancamentos', { params });
      setResultado(data);
      setErroLista('');
    } catch (err) {
      setErroLista(err.response?.data?.erro ?? 'Não foi possível carregar os lançamentos.');
    } finally {
      setCarregando(false);
    }
  }, [filtros, pagina]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function alterarFiltro(campo, valor) {
    setFiltros((anterior) => ({ ...anterior, [campo]: valor }));
    setPagina(1);
  }

  function alterarForm(campo, valor) {
    setForm((anterior) => {
      const novo = { ...anterior, [campo]: valor };
      if (campo === 'tipo') novo.categoriaId = ''; // a categoria precisa ser do mesmo tipo
      return novo;
    });
  }

  function cancelar() {
    setForm(formVazio());
    setEditandoId(null);
    setErros({});
    setErroGeral('');
  }

  function editar(item) {
    setErroAcao('');
    setErros({});
    setErroGeral('');
    setEditandoId(item.id);
    setForm({
      tipo: item.tipo,
      descricao: item.descricao,
      valor: item.valor,
      data: item.data,
      categoriaId: String(item.categoriaId),
      fonteDestinoId: String(item.fonteDestinoId),
    });
  }

  async function enviar(e) {
    e.preventDefault();
    setErroGeral('');
    setErroAcao('');

    const errosCliente = validar(form);
    setErros(errosCliente);
    if (Object.keys(errosCliente).length) return;

    const corpo = {
      tipo: form.tipo,
      descricao: form.descricao,
      valor: form.valor,
      data: form.data,
      categoriaId: Number(form.categoriaId),
      fonteDestinoId: Number(form.fonteDestinoId),
    };

    setSalvando(true);
    try {
      if (editandoId) await api.put(`/lancamentos/${editandoId}`, corpo);
      else await api.post('/lancamentos', corpo);
      cancelar();
      await carregar();
    } catch (err) {
      const campos = err.response?.data?.campos;
      if (campos) setErros(campos); // mensagens do servidor junto ao campo
      else setErroGeral(err.response?.data?.erro ?? 'Não foi possível conectar ao servidor.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(item) {
    if (!window.confirm(`Excluir "${item.descricao}"?`)) return;
    setErroAcao('');
    try {
      await api.delete(`/lancamentos/${item.id}`);
      if (editandoId === item.id) cancelar();
      // Se era o único item da página, volta uma página
      if (resultado.lancamentos.length === 1 && pagina > 1) setPagina((p) => p - 1);
      else await carregar();
    } catch (err) {
      setErroAcao(err.response?.data?.erro ?? 'Não foi possível excluir.');
    }
  }

  const categoriasDoTipo = categorias.filter((c) => c.tipo === form.tipo);
  const lancamentos = resultado?.lancamentos ?? [];
  const totais = resultado?.totais;
  const paginacao = resultado?.paginacao;

  return (
    <div>
      <h1>Lançamentos</h1>

      {/* Formulário */}
      <form onSubmit={enviar} style={{ display: 'grid', gap: 12, maxWidth: 360, marginBottom: 32 }}>
        <h2 style={{ margin: 0 }}>{editandoId ? 'Editar lançamento' : 'Novo lançamento'}</h2>

        <label style={{ display: 'grid', gap: 4 }}>
          Tipo
          <select value={form.tipo} onChange={(e) => alterarForm('tipo', e.target.value)}>
            <option value="saida">Saída</option>
            <option value="entrada">Entrada</option>
          </select>
          {erros.tipo && <span style={estiloErro}>{erros.tipo}</span>}
        </label>

        <Campo
          label="Descrição"
          value={form.descricao}
          onChange={(e) => alterarForm('descricao', e.target.value)}
          erro={erros.descricao}
        />
        <Campo
          label="Valor (R$)"
          type="number"
          min="0"
          step="0.01"
          value={form.valor}
          onChange={(e) => alterarForm('valor', e.target.value)}
          erro={erros.valor}
        />
        <Campo
          label="Data"
          type="date"
          value={form.data}
          onChange={(e) => alterarForm('data', e.target.value)}
          erro={erros.data}
        />

        <label style={{ display: 'grid', gap: 4 }}>
          Categoria
          <select value={form.categoriaId} onChange={(e) => alterarForm('categoriaId', e.target.value)}>
            <option value="">Selecione...</option>
            {categoriasDoTipo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          {erros.categoriaId && <span style={estiloErro}>{erros.categoriaId}</span>}
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          {form.tipo === 'entrada' ? 'Fonte' : 'Destino'}
          <select value={form.fonteDestinoId} onChange={(e) => alterarForm('fonteDestinoId', e.target.value)}>
            <option value="">Selecione...</option>
            {fontes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
          {erros.fonteDestinoId && <span style={estiloErro}>{erros.fonteDestinoId}</span>}
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

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginBottom: 16 }}>
        <Campo label="De" type="date" value={filtros.inicio} onChange={(e) => alterarFiltro('inicio', e.target.value)} />
        <Campo label="Até" type="date" value={filtros.fim} onChange={(e) => alterarFiltro('fim', e.target.value)} />
        <label style={{ display: 'grid', gap: 4 }}>
          Tipo
          <select value={filtros.tipo} onChange={(e) => alterarFiltro('tipo', e.target.value)}>
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          Categoria
          <select value={filtros.categoriaId} onChange={(e) => alterarFiltro('categoriaId', e.target.value)}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} ({c.tipo === 'entrada' ? 'entrada' : 'saída'})
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          Fonte/destino
          <select value={filtros.fonteDestinoId} onChange={(e) => alterarFiltro('fonteDestinoId', e.target.value)}>
            <option value="">Todas</option>
            {fontes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Totais do período filtrado */}
      {totais && (
        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          <div>
            <small>Entradas</small>
            <div style={{ color: 'green', fontWeight: 'bold' }}>{reais(totais.entradas)}</div>
          </div>
          <div>
            <small>Saídas</small>
            <div style={{ color: 'crimson', fontWeight: 'bold' }}>{reais(totais.saidas)}</div>
          </div>
          <div>
            <small>Saldo</small>
            <div style={{ fontWeight: 'bold', color: Number(totais.saldo) < 0 ? 'crimson' : 'inherit' }}>
              {reais(totais.saldo)}
            </div>
          </div>
        </div>
      )}

      {erroAcao && <p style={estiloErro}>{erroAcao}</p>}

      {/* Lista */}
      {carregando && !resultado ? (
        <p>Carregando...</p>
      ) : erroLista ? (
        <p style={estiloErro}>{erroLista}</p>
      ) : lancamentos.length === 0 ? (
        <p>Nenhum lançamento encontrado neste período.</p>
      ) : (
        <>
          <table style={{ borderCollapse: 'collapse', minWidth: 680 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: 8 }}>Data</th>
                <th style={{ padding: 8 }}>Descrição</th>
                <th style={{ padding: 8 }}>Categoria</th>
                <th style={{ padding: 8 }}>Fonte/destino</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Valor</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>{dataBR(l.data)}</td>
                  <td style={{ padding: 8 }}>
                    {l.descricao}
                    {l.totalParcelas > 1 && ` (${l.parcelaAtual}/${l.totalParcelas})`}
                  </td>
                  <td style={{ padding: 8 }}>{l.categoria}</td>
                  <td style={{ padding: 8 }}>{l.fonteDestino}</td>
                  <td
                    style={{
                      padding: 8,
                      textAlign: 'right',
                      color: l.tipo === 'entrada' ? 'green' : 'crimson',
                    }}
                  >
                    {l.tipo === 'entrada' ? '+' : '-'} {reais(l.valor)}
                  </td>
                  <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                    <button onClick={() => editar(l)}>Editar</button>
                    <button onClick={() => excluir(l)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
            <button disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </button>
            <span>
              Página {paginacao.pagina} de {paginacao.totalPaginas} ({paginacao.total} lançamentos)
            </span>
            <button disabled={pagina >= paginacao.totalPaginas} onClick={() => setPagina((p) => p + 1)}>
              Próxima
            </button>
          </div>
        </>
      )}
    </div>
  );
}