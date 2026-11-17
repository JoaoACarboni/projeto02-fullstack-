import { reais } from './formatos';

// Paleta categórica (a ordem é fixa: a mesma categoria mantém a cor na rosca e na legenda)
const CORES =['#2a6fdb', '#e8833a', '#2e9d6a', '#c94f7c', '#7a5cc9', '#c9a227', '#3aa6b9', '#8a8f98'];

// Gráfico de rosca em SVG. dados: [{ nome, valor }]
export function GraficoRosca({ dados, titulo }) {
  const total = dados.reduce((s, d) => s + d.valor, 0);
  if (total <= 0) return <p className="vazio">Sem dados para o gráfico.</p>;

  // Mais de 8 fatias: agrupa o resto em "Demais"
  const fatias = dados.length > CORES.length
    ? [...dados.slice(0, CORES.length - 1), {
        nome: 'Demais',
        valor: dados.slice(CORES.length - 1).reduce((s, d) => s + d.valor, 0),
      }]
    : dados;

  const raio = 60;
  const circunferencia = 2 * Math.PI * raio;
  // Início de cada fatia ao longo do círculo (soma das fatias anteriores)
  const tamanhos = fatias.map((f) => (f.valor / total) * circunferencia);
  const inicios = tamanhos.map((_, i) => tamanhos.slice(0, i).reduce((s, t) => s + t, 0));

  return (
    <figure className="grafico-rosca">
      <svg viewBox="0 0 160 160" role="img" aria-label={titulo}>
        <g transform="rotate(-90 80 80)">
          {fatias.map((f, i) => (
            <circle
              key={f.nome}
              cx="80"
              cy="80"
              r={raio}
              fill="none"
              stroke={CORES[i]}
              strokeWidth="26"
              strokeDasharray={`${Math.max(tamanhos[i] - 1.5, 0.5)} ${circunferencia}`}
              strokeDashoffset={-inicios[i]}
            >
              <title>{`${f.nome}: ${reais(f.valor)}`}</title>
            </circle>
          ))}
        </g>
        <text x="80" y="76" textAnchor="middle" className="rosca-rotulo">Total</text>
        <text x="80" y="94" textAnchor="middle" className="rosca-valor">{reais(total)}</text>
      </svg>
      <ul className="legenda">
        {fatias.map((f, i) => (
          <li key={f.nome}>
            <span className="marcador" style={{ background: CORES[i] }} />
            {f.nome}
            <strong>{((f.valor / total) * 100).toFixed(1)}%</strong>
          </li>
        ))}
      </ul>
    </figure>
  );
}

// Barras horizontais agrupadas.
// linhas: [{ nome, valores: [n1, n2...] }]; series: [{ nome, cor }]
export function GraficoBarras({ linhas, series }) {
  const maximo = Math.max(...linhas.flatMap((l) => l.valores), 0);
  if (maximo <= 0) return <p className="vazio">Sem dados para o gráfico.</p>;

  return (
    <div className="grafico-barras">
      {series.length > 1 && (
        <ul className="legenda legenda-linha">
          {series.map((s) => (
            <li key={s.nome}>
              <span className="marcador" style={{ background: s.cor }} />
              {s.nome}
            </li>
          ))}
        </ul>
      )}
      {linhas.map((l) => (
        <div key={l.nome} className="barra-linha">
          <span className="barra-nome">{l.nome}</span>
          <div className="barra-grupo">
            {l.valores.map((v, i) => (
              <div key={series[i].nome} className="barra-trilho">
                <div
                  className="barra"
                  style={{ width: `${(v / maximo) * 100}%`, background: series[i].cor }}
                  title={`${series[i].nome}: ${reais(v)}`}
                />
                <span className="barra-valor">{reais(v)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Barra de progresso (uso do limite do cartão, por exemplo)
export function BarraUso({ percentual }) {
  const p = Math.max(0, Math.min(percentual, 100));
  const classe = p >= 90 ? 'critico' : p >= 60 ? 'alerta' : '';
  return (
    <div className="uso-trilho" role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`uso-barra ${classe}`} style={{ width: `${p}%` }} />
    </div>
  );
}
