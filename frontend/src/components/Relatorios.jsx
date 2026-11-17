import { useEffect, useState } from 'react';
import { api } from '../services/api';
import Campo from './Campo';
import { GraficoRosca, GraficoBarras } from './Graficos';
import { reais, dataBR, periodoDoMes, mensagemDeErro } from './formatos';

const TIPOS = { renda: 'Renda', conta: 'Conta', cartao_credito: 'Cartão de crédito' };

// Diferença em relação ao período anterior: ▲ aumento / ▼ redução
// Para saídas, aumento é ruim (vermelho); para entradas, é bom (verde).
function Variacao({ atual, anterior, saida }) {
  if (anterior === 0 && atual === 0) return <span className="neutro">—</span>;
  if (anterior === 0) return <span className={saida ? 'negativo' : 'positivo'}>novo</span>;
  const pct = ((atual - anterior) / anterior) * 100;
  if (Math.abs(pct) < 0.05) return <span className="neutro">= 0%</span>;
  const subiu = pct > 0;
  const classe = subiu === saida ? 'negativo' : 'positivo';
  return (
    <span className={classe}>
      {subiu ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function TabelaCategorias({ itens, total, saida }) {
  if (itens.length === 0) return <p className="vazio">Nenhum lançamento no período.</p>;
  return (
    <table className="tabela">
      <thead>
        <tr>
          <th>Categoria</th>
          <th className="num">Total</th>
          <th className="num">%</th>
          <th className="num">Período anterior</th>
          <th className="num">Variação</th>
        </tr>
      </thead>
      <tbody>
        {itens.map((c) => (
          <tr key={c.id}>
            <td>{c.nome}</td>
            <td className="num">{reais(c.total)}</td>
            <td className="num">{c.percentual.toFixed(2)}%</td>
            <td className="num">{reais(c.periodoAnterior)}</td>
            <td className="num">
              <Variacao atual={c.total} anterior={c.periodoAnterior} saida={saida} />
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          <td className="num">{reais(total)}</td>
          <td className="num">100%</td>
          <td colSpan={2} />
        </tr>
      </tfoot>
    </table>
  );
}

export default function Relatorios() {
  const [periodo, setPeriodo] = useState(() => periodoDoMes(0));
  const [porCategoria, setPorCategoria] = useState(null);
  const [porFonte, setPorFonte] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Só consulta com um período válido (as duas datas e início <= fim)
  const periodoValido = Boolean(periodo.inicio && periodo.fim && periodo.inicio <= periodo.fim);

  useEffect(() => {
    if (!periodoValido) return undefined;
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      try {
        const [c, f] = await Promise.all([
          api.get('/relatorios/categorias', { params: periodo }),
          api.get('/relatorios/fontes-destinos', { params: periodo }),
        ]);
        if (!ativo) return;
        setPorCategoria(c.data);
        setPorFonte(f.data);
        setErro('');
      } catch (err) {
        if (ativo) setErro(mensagemDeErro(err, 'Não foi possível carregar os relatórios.'));
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, [periodo, periodoValido]);

  const atalhos = [
    ['Mês atual', periodoDoMes(0)],
    ['Mês anterior', periodoDoMes(-1)],
    ['Últimos 3 meses', { inicio: periodoDoMes(-2).inicio, fim: periodoDoMes(0).fim }],
  ];

  const fontes = porFonte?.fontesDestinos ?? [];
  const entradasPorFonte = fontes.filter((f) => f.entradas > 0);
  const saidasPorDestino = fontes.filter((f) => f.saidas > 0);
  const contas = fontes.filter((f) => f.tipo === 'conta');

  return (
    <div>
      <h1>Relatórios</h1>

      <div className="filtros">
        <Campo label="De" type="date" value={periodo.inicio} onChange={(e) => setPeriodo((p) => ({ ...p, inicio: e.target.value }))} />
        <Campo label="Até" type="date" value={periodo.fim} onChange={(e) => setPeriodo((p) => ({ ...p, fim: e.target.value }))} />
        {atalhos.map(([texto, p]) => (
          <button key={texto} type="button" className="secundario" onClick={() => setPeriodo(p)}>
            {texto}
          </button>
        ))}
      </div>

      {!periodoValido && (
        <p className="erro">Escolha um período válido: a data final deve ser igual ou posterior à inicial.</p>
      )}
      {periodoValido && erro && <p className="erro">{erro}</p>}
      {carregando && !porCategoria && !erro && <p>Carregando...</p>}

      {periodoValido && porCategoria && porFonte && (
        <div style={{ opacity: carregando ? 0.6 : 1 }}>
          <p className="ajuda">
            Comparando {dataBR(porCategoria.periodo.inicio)} a {dataBR(porCategoria.periodo.fim)} com o período
            anterior de mesmo tamanho ({dataBR(porCategoria.periodoComparacao.inicio)} a{' '}
            {dataBR(porCategoria.periodoComparacao.fim)}).
          </p>

          {/* RF7 — por categoria */}
          <section className="cartao">
            <h2>Saídas por categoria</h2>
            <div className="duas-colunas">
              <TabelaCategorias itens={porCategoria.categorias} total={porCategoria.totalSaidas} saida />
              <GraficoRosca
                titulo="Saídas por categoria"
                dados={porCategoria.categorias.map((c) => ({ nome: c.nome, valor: c.total }))}
              />
            </div>
            {porCategoria.categorias.length > 0 && (
              <>
                <h3>Comparação com o período anterior</h3>
                <GraficoBarras
                  series={[
                    { nome: 'Período atual', cor: '#2a6fdb' },
                    { nome: 'Período anterior', cor: '#a9b4c2' },
                  ]}
                  linhas={porCategoria.categorias.map((c) => ({ nome: c.nome, valores: [c.total, c.periodoAnterior] }))}
                />
              </>
            )}
          </section>

          <section className="cartao">
            <h2>Entradas por categoria</h2>
            <TabelaCategorias itens={porCategoria.entradas} total={porCategoria.totalEntradas} saida={false} />
          </section>

          {/* RF8 — por fonte/destino */}
          <section className="cartao">
            <h2>Movimentação por fonte/destino</h2>
            <div className="duas-colunas">
              <div>
                <h3>Entradas por fonte</h3>
                {entradasPorFonte.length === 0 ? (
                  <p className="vazio">Nenhuma entrada no período.</p>
                ) : (
                  <GraficoBarras
                    series={[{ nome: 'Entradas', cor: '#2e9d6a' }]}
                    linhas={entradasPorFonte.map((f) => ({ nome: f.nome, valores: [f.entradas] }))}
                  />
                )}
              </div>
              <div>
                <h3>Saídas por destino</h3>
                {saidasPorDestino.length === 0 ? (
                  <p className="vazio">Nenhuma saída no período.</p>
                ) : (
                  <GraficoBarras
                    series={[{ nome: 'Saídas', cor: '#d64545' }]}
                    linhas={saidasPorDestino.map((f) => ({ nome: f.nome, valores: [f.saidas] }))}
                  />
                )}
              </div>
            </div>

            <table className="tabela">
              <thead>
                <tr>
                  <th>Fonte/destino</th>
                  <th>Tipo</th>
                  <th className="num">Entradas</th>
                  <th className="num">Saídas</th>
                  <th className="num">Saldo (contas)</th>
                </tr>
              </thead>
              <tbody>
                {fontes.map((f) => (
                  <tr key={f.id}>
                    <td>{f.nome}</td>
                    <td>{TIPOS[f.tipo]}</td>
                    <td className="num positivo">{reais(f.entradas)}</td>
                    <td className="num negativo">{reais(f.saidas)}</td>
                    <td className={`num ${f.saldo < 0 ? 'negativo' : ''}`}>{f.saldo === null ? '—' : reais(f.saldo)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Total</td>
                  <td className="num">{reais(porFonte.totalEntradas)}</td>
                  <td className="num">{reais(porFonte.totalSaidas)}</td>
                  <td className="num">
                    {contas.length > 0 ? reais(contas.reduce((s, c) => s + c.saldo, 0)) : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}
