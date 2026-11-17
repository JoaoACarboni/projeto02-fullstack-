import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { GraficoRosca } from './Graficos';
import { reais, dataBR, mesBR, periodoDoMes, mensagemDeErro } from './formatos';

export default function Dashboard() {
  const { usuario } = useAuth();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const periodo = periodoDoMes(0);
    Promise.all([
      api.get('/lancamentos', { params: periodo }),
      api.get('/relatorios/categorias', { params: periodo }),
      api.get('/relatorios/faturas', { params: { meses: 1 } }),
    ])
      .then(([l, c, f]) => setDados({ lancamentos: l.data, categorias: c.data, faturas: f.data }))
      .catch((err) => setErro(mensagemDeErro(err, 'Não foi possível carregar o resumo.')));
  }, []);

  const totais = dados?.lancamentos.totais;

  return (
    <div>
      <h1>Olá, {usuario?.nome}!</h1>
      <p className="ajuda">Resumo de {mesBR(periodoDoMes(0).inicio.slice(0, 7))}.</p>

      {erro && <p className="erro">{erro}</p>}
      {!dados && !erro && <p>Carregando...</p>}

      {dados && (
        <>
          <div className="indicadores">
            <div className="cartao">
              <small>Entradas do mês</small>
              <strong className="positivo">{reais(totais.entradas)}</strong>
            </div>
            <div className="cartao">
              <small>Saídas do mês</small>
              <strong className="negativo">{reais(totais.saidas)}</strong>
            </div>
            <div className="cartao">
              <small>Saldo do mês</small>
              <strong className={totais.saldo < 0 ? 'negativo' : ''}>{reais(totais.saldo)}</strong>
            </div>
          </div>

          <div className="duas-colunas">
            <section className="cartao">
              <h2>Saídas por categoria</h2>
              <GraficoRosca
                titulo="Saídas do mês por categoria"
                dados={dados.categorias.categorias.map((c) => ({ nome: c.nome, valor: c.total }))}
              />
              <Link to="/relatorios">Ver relatório completo →</Link>
            </section>

            <section className="cartao">
              <h2>Faturas abertas</h2>
              {dados.faturas.length === 0 ? (
                <p className="vazio">Nenhum cartão de crédito cadastrado.</p>
              ) : (
                <ul className="fatura-itens">
                  {dados.faturas.map(({ cartao, faturas }) => (
                    <li key={cartao.id}>
                      <span>
                        {cartao.nome}
                        <small>vence {dataBR(faturas[0].vencimento)}</small>
                      </span>
                      <strong>{reais(faturas[0].total)}</strong>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/faturas">Ver faturas →</Link>
            </section>
          </div>

          <section className="cartao">
            <h2>Últimos lançamentos</h2>
            {dados.lancamentos.lancamentos.length === 0 ? (
              <p className="vazio">
                Nenhum lançamento neste mês. <Link to="/lancamentos">Adicionar lançamento</Link>
              </p>
            ) : (
              <ul className="fatura-itens">
                {dados.lancamentos.lancamentos.slice(0, 5).map((l) => (
                  <li key={l.id}>
                    <span>
                      {l.descricao}
                      {l.totalParcelas > 1 && <span className="parcela"> — {l.parcelaAtual}/{l.totalParcelas}</span>}
                      <small>
                        {dataBR(l.data)} · {l.categoria}
                      </small>
                    </span>
                    <span className={l.tipo === 'entrada' ? 'positivo' : 'negativo'}>
                      {l.tipo === 'entrada' ? '+' : '−'} {reais(l.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/lancamentos">Ver todos →</Link>
          </section>
        </>
      )}
    </div>
  );
}
