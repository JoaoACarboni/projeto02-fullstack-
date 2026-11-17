// Funções de formatação e datas usadas por várias telas

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const reais = (v) => moeda.format(Number(v) || 0);

// '2026-11-17' -> '17/11/2026'
export const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// '2026-11' -> 'nov/2026'
export function mesBR(referencia) {
  const [ano, mes] = referencia.split('-').map(Number);
  const nome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${nome}/${ano}`;
}

const pad = (n) => String(n).padStart(2, '0');
export const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Primeiro e último dia do mês atual + k
export function periodoDoMes(k = 0) {
  const h = new Date();
  return {
    inicio: isoDe(new Date(h.getFullYear(), h.getMonth() + k, 1)),
    fim: isoDe(new Date(h.getFullYear(), h.getMonth() + k + 1, 0)),
  };
}

export const mensagemDeErro = (err, padrao) => err.response?.data?.erro ?? padrao;
