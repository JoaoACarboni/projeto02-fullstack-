import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { GraficoBarras, BarraUso } from './Graficos';
import { reais, mesBR, mensagemDeErro } from './formatos';

const COR_NOTA = { Ótima: 'positivo', Boa: 'positivo', Atenção: 'alerta', Crítica: 'negativo' };

export default function SaudeFinanceira() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api
      .get('/saude-financeira')
      .then(({ data }) => setDados(data))
      .catch((err) => setErro(mensagemDeErro(err, 'Não foi possível carregar a análise.')));
  }, []);

  if (erro) return <p className="erro">{erro}</p>;
  if (!dados) return <p>Carregando...</p>;

  const { indicadores: ind, mesesAnalisados, projecao } = dados;

  return (
    <div>
      <h1>Saúde financeira</h1>
      <p className="ajuda">
        Análise dos últimos {mesesAnalisados.length} meses completos ({mesBR(mesesAnalisados[0].mes)} a{' '}
        {mesBR(mesesAnalisados[mesesAnalisados.length - 1].mes)}).
      </p>

      <section className="cartao nota">
        <div className={`nota-numero ${COR_NOTA[dados.classificacao]}`}>{dados.nota}</div>
        <div>
          <h2>{dados.classificacao}</h2>
          <p className="ajuda">
            Nota de 0 a 100: taxa de poupança (40 pts), uso do limite dos cartões (30 pts) e meses fechados no azul
            (30 pts).
          </p>
        </div>
      </section>

      <div className="indicadores">
        <div className="cartao">
          <small>Renda média mensal</small>
          <strong className="positivo">{reais(ind.rendaMediaMensal)}</strong>
        </div>
        <div className="cartao">
          <small>Gasto médio mensal</small>
          <strong className="negativo">{reais(ind.gastoMedioMensal)}</strong>
        </div>
        <div className="cartao">
          <small>Sobra média mensal</small>
          <strong className={ind.saldoMedioMensal < 0 ? 'negativo' : ''}>{reais(ind.saldoMedioMensal)}</strong>
        </div>
        <div className="cartao">
          <small>Taxa de poupança</small>
          <strong className={ind.taxaPoupanca < 0 ? 'negativo' : ''}>{ind.taxaPoupanca.toFixed(1)}%</strong>
        </div>
        <div className="cartao">
          <small>Meses no azul</small>
          <strong>
            {ind.mesesPositivos} de {mesesAnalisados.length}
          </strong>
        </div>
        <div className="cartao">
          <small>Reserva de emergência ideal</small>
          <strong>{reais(ind.reservaEmergenciaIdeal)}</strong>
        </div>
      </div>

      <section className="cartao">
        <h2>Dicas para você</h2>
        <ul className="dicas">
          {dados.dicas.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <div className="duas-colunas">
        <section className="cartao">
          <h2>Entradas × saídas por mês</h2>
          <GraficoBarras
            series={[
              { nome: 'Entradas', cor: '#2e9d6a' },
              { nome: 'Saídas', cor: '#d64545' },
            ]}
            linhas={mesesAnalisados.map((m) => ({ nome: mesBR(m.mes), valores: [m.entradas, m.saidas] }))}
          />
        </section>

        <section className="cartao">
          <h2>Maiores gastos (média mensal)</h2>
          {dados.maioresGastos.length === 0 ? (
            <p className="vazio">Sem gastos no período.</p>
          ) : (
            <GraficoBarras
              series={[{ nome: 'Média mensal', cor: '#2a6fdb' }]}
              linhas={dados.maioresGastos.map((c) => ({ nome: c.nome, valores: [c.mediaMensal] }))}
            />
          )}
        </section>
      </div>

      <section className="cartao">
        <h2>Projeção dos próximos meses</h2>
        <p className="ajuda">
          Considerando que renda e gastos sigam a média. As parcelas já assumidas nos cartões mostram quanto dos gastos
          futuros já está comprometido.
        </p>
        <table className="tabela">
          <thead>
            <tr>
              <th>Mês</th>
              <th className="num">Entradas previstas</th>
              <th className="num">Saídas previstas</th>
              <th className="num">Já comprometido nos cartões</th>
              <th className="num">Sobra acumulada</th>
            </tr>
          </thead>
          <tbody>
            {projecao.map((p) => (
              <tr key={p.mes}>
                <td>{mesBR(p.mes)}</td>
                <td className="num">{reais(p.entradasPrevistas)}</td>
                <td className="num">{reais(p.saidasPrevistas)}</td>
                <td className="num">{reais(p.parcelasCartao)}</td>
                <td className={`num ${p.saldoAcumulado < 0 ? 'negativo' : 'positivo'}`}>{reais(p.saldoAcumulado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {dados.cartoes.length > 0 && (
        <section className="cartao">
          <h2>Uso do limite dos cartões</h2>
          {dados.cartoes.map((c) => (
            <div key={c.id} className="uso-cartao">
              <span>
                {c.nome} — {c.usoLimite.toFixed(1)}% · próxima fatura {reais(c.proximaFatura)}
              </span>
              <BarraUso percentual={c.usoLimite} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
