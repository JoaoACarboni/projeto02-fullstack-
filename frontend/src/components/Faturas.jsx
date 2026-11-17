import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { BarraUso } from './Graficos';
import { reais, dataBR, mesBR, mensagemDeErro } from './formatos';

function Fatura({ fatura }) {
  return (
    <article className={`fatura ${fatura.aberta ? 'aberta' : ''}`}>
      <header>
        <div>
          <strong>{mesBR(fatura.referencia)}</strong>
          {fatura.aberta && <span className="selo">Aberta</span>}
        </div>
        <span className="fatura-total">{reais(fatura.total)}</span>
      </header>
      <p className="ajuda">
        Fecha em {dataBR(fatura.fechamento)} · vence em {dataBR(fatura.vencimento)}
      </p>
      {fatura.lancamentos.length === 0 ? (
        <p className="vazio">Nenhum lançamento.</p>
      ) : (
        <ul className="fatura-itens">
          {fatura.lancamentos.map((l) => (
            <li key={l.id}>
              <span>
                {l.descricao}
                {l.parcela !== '1/1' && <span className="parcela"> — {l.parcela}</span>}
                <small>{dataBR(l.data)}</small>
              </span>
              <span>{reais(l.valor)}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function Faturas() {
  const [meses, setMeses] = useState(3);
  const [cartoes, setCartoes] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    api
      .get('/relatorios/faturas', { params: { meses } })
      .then(({ data }) => {
        if (!ativo) return;
        setCartoes(data);
        setErro('');
      })
      .catch((err) => ativo && setErro(mensagemDeErro(err, 'Não foi possível carregar as faturas.')));
    return () => {
      ativo = false;
    };
  }, [meses]);

  return (
    <div>
      <h1>Faturas dos cartões</h1>

      <div className="filtros">
        <label className="campo">
          Próximas faturas
          <select value={meses} onChange={(e) => setMeses(Number(e.target.value))}>
            {[3, 6, 12].map((n) => (
              <option key={n} value={n}>
                {n} meses
              </option>
            ))}
          </select>
        </label>
      </div>

      {erro && <p className="erro">{erro}</p>}
      {!cartoes && !erro && <p>Carregando...</p>}

      {cartoes?.length === 0 && (
        <p className="vazio">
          Você ainda não tem cartões de crédito. Cadastre um em <Link to="/fontes-destinos">Fontes/Destinos</Link>.
        </p>
      )}

      {cartoes?.map(({ cartao, limiteUtilizado, limiteDisponivel, faturas }) => {
        const percentual = cartao.limite > 0 ? (limiteUtilizado / cartao.limite) * 100 : 0;
        return (
          <section key={cartao.id} className="cartao">
            <h2>{cartao.nome}</h2>
            <p className="ajuda">
              Fecha todo dia {cartao.diaFechamento} · vence todo dia {cartao.diaVencimento}
            </p>

            <div className="limite">
              <div className="resumo">
                <div>
                  <small>Limite</small>
                  <strong>{reais(cartao.limite)}</strong>
                </div>
                <div>
                  <small>Utilizado</small>
                  <strong className="negativo">{reais(limiteUtilizado)}</strong>
                </div>
                <div>
                  <small>Disponível</small>
                  <strong className={limiteDisponivel < 0 ? 'negativo' : 'positivo'}>{reais(limiteDisponivel)}</strong>
                </div>
              </div>
              <BarraUso percentual={percentual} />
              <small className="ajuda">
                {percentual.toFixed(1)}% do limite comprometido (inclui todas as parcelas ainda não vencidas)
              </small>
            </div>

            <div className="faturas">
              {faturas.map((f) => (
                <Fatura key={f.referencia} fatura={f} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
