import { pool } from '../config/db.js';
import { Fatura } from './fatura.js';

// Quantos meses completos (antes do mês atual) entram nas médias
const MESES_ANALISADOS = 3;
// Quantos meses à frente são projetados
const MESES_PROJECAO = 3;

function arredondar(n) {
  return Math.round(n * 100) / 100;
}

function media(lista) {
  return lista.length ? lista.reduce((s, n) => s + n, 0) / lista.length : 0;
}

// 'AAAA-MM' de hoje + k meses (k pode ser negativo)
function mesRelativo(k) {
  const hoje = new Date();
  const d = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth() + k, 1));
  return d.toISOString().slice(0, 7);
}

// Entradas e saídas de cada um dos últimos meses completos (agregado no banco)
async function totaisMensais(usuarioId) {
  const { rows } = await pool.query(
    `SELECT to_char(date_trunc('month', data), 'YYYY-MM') AS mes,
            COALESCE(SUM(valor) FILTER (WHERE tipo = 'entrada'), 0) AS entradas,
            COALESCE(SUM(valor) FILTER (WHERE tipo = 'saida'), 0) AS saidas
       FROM lancamentos
      WHERE usuario_id = $1
        AND data >= date_trunc('month', CURRENT_DATE) - make_interval(months => $2)
        AND data <  date_trunc('month', CURRENT_DATE)
      GROUP BY 1`,
    [usuarioId, MESES_ANALISADOS]
  );

  // Garante um item por mês, mesmo sem lançamentos (total 0)
  const meses = [];
  for (let k = -MESES_ANALISADOS; k < 0; k++) {
    const mes = mesRelativo(k);
    const linha = rows.find((r) => r.mes === mes);
    meses.push({
      mes,
      entradas: linha ? Number(linha.entradas) : 0,
      saidas: linha ? Number(linha.saidas) : 0,
    });
  }
  return meses.map((m) => ({ ...m, saldo: arredondar(m.entradas - m.saidas) }));
}

// Gasto médio mensal por categoria no período analisado + gasto do último mês
async function gastosPorCategoria(usuarioId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.nome,
            SUM(l.valor) AS total,
            COALESCE(SUM(l.valor) FILTER (
              WHERE l.data >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'), 0) AS ultimo_mes
       FROM lancamentos l
       JOIN categorias c ON c.id = l.categoria_id
      WHERE l.usuario_id = $1
        AND l.tipo = 'saida'
        AND l.data >= date_trunc('month', CURRENT_DATE) - make_interval(months => $2)
        AND l.data <  date_trunc('month', CURRENT_DATE)
      GROUP BY c.id, c.nome
      ORDER BY total DESC`,
    [usuarioId, MESES_ANALISADOS]
  );
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    mediaMensal: arredondar(Number(r.total) / MESES_ANALISADOS),
    ultimoMes: Number(r.ultimo_mes),
  }));
}

// Nota de 0 a 100 a partir de três critérios simples
function calcularNota({ taxaPoupanca, usoLimite, mesesPositivos }) {
  // Poupança: 20% ou mais da renda vale a nota máxima (40 pontos)
  const pontosPoupanca = Math.max(0, Math.min(taxaPoupanca / 20, 1)) * 40;
  // Cartão: até 30% do limite é o ideal (30 pontos); 100% ou mais zera
  const pontosCartao = usoLimite === null ? 30 : usoLimite <= 30 ? 30 : Math.max(0, (100 - usoLimite) / 70) * 30;
  // Constância: meses fechados no azul (30 pontos)
  const pontosConstancia = (mesesPositivos / MESES_ANALISADOS) * 30;

  const nota = Math.round(pontosPoupanca + pontosCartao + pontosConstancia);
  const classificacao = nota >= 80 ? 'Ótima' : nota >= 60 ? 'Boa' : nota >= 40 ? 'Atenção' : 'Crítica';
  return { nota, classificacao };
}

const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatoNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function gerarDicas({ rendaMedia, gastoMedio, taxaPoupanca, usoLimite, categorias, cartoes, mesesPositivos }) {
  const dicas = [];
  const reais = (v) => formatoMoeda.format(v);
  const pct = (v) => `${formatoNumero.format(v)}%`;

  if (rendaMedia === 0 && gastoMedio === 0) {
    dicas.push('Registre suas entradas e saídas por alguns meses para receber uma análise completa.');
    return dicas;
  }

  if (taxaPoupanca < 0) {
    dicas.push(
      `Você gastou em média ${reais(gastoMedio - rendaMedia)} a mais do que ganhou por mês. ` +
        'Reveja os maiores gastos abaixo e defina um teto mensal para eles.'
    );
  } else if (taxaPoupanca < 10) {
    dicas.push(
      `Sua taxa de poupança é de ${pct(taxaPoupanca)}. Tente guardar ao menos 10% da renda ` +
        `(${reais(rendaMedia * 0.1)} por mês) logo que o salário entrar.`
    );
  } else if (taxaPoupanca >= 20) {
    dicas.push(
      `Ótimo: você guarda ${pct(taxaPoupanca)} da renda. Considere direcionar parte disso para uma reserva de emergência ou investimentos.`
    );
  } else {
    dicas.push(`Você guarda ${pct(taxaPoupanca)} da renda. A meta recomendada é chegar a 20%.`);
  }

  // Reserva de emergência: 6 meses do gasto médio
  if (gastoMedio > 0) {
    dicas.push(`Uma reserva de emergência ideal para o seu padrão de gastos é de ${reais(gastoMedio * 6)} (6 meses de despesas).`);
  }

  // Maior categoria de gasto
  const maior = categorias[0];
  if (maior && gastoMedio > 0) {
    const fatia = (maior.mediaMensal / gastoMedio) * 100;
    if (fatia >= 35) {
      dicas.push(
        `"${maior.nome}" representa ${pct(Math.round(fatia))} dos seus gastos. Reduzir 10% nessa categoria economizaria ${reais(maior.mediaMensal * 0.1)} por mês.`
      );
    }
  }

  // Categorias que cresceram muito no último mês
  for (const c of categorias) {
    if (c.mediaMensal > 0 && c.ultimoMes > c.mediaMensal * 1.3 && c.ultimoMes - c.mediaMensal >= 50) {
      dicas.push(`Seus gastos com "${c.nome}" no último mês (${reais(c.ultimoMes)}) ficaram acima da sua média (${reais(c.mediaMensal)}).`);
    }
  }

  // Uso do limite dos cartões
  if (usoLimite !== null && usoLimite > 30) {
    dicas.push(
      `Você está usando ${pct(Math.round(usoLimite))} do limite dos cartões. Manter o uso abaixo de 30% evita aperto nas próximas faturas.`
    );
  }
  for (const c of cartoes) {
    if (c.proximaFatura > 0 && rendaMedia > 0 && c.proximaFatura > rendaMedia * 0.5) {
      dicas.push(`A próxima fatura do ${c.nome} (${reais(c.proximaFatura)}) compromete mais da metade da sua renda média.`);
    }
  }

  if (mesesPositivos === MESES_ANALISADOS && taxaPoupanca >= 0) {
    dicas.push('Você fechou todos os últimos meses no azul. Continue assim!');
  }

  return dicas;
}

export const SaudeFinanceira = {
  async analisar(usuarioId) {
    const meses = await totaisMensais(usuarioId);
    const categorias = await gastosPorCategoria(usuarioId);
    const faturas = await Fatura.listar(usuarioId, MESES_PROJECAO);

    const rendaMedia = arredondar(media(meses.map((m) => m.entradas)));
    const gastoMedio = arredondar(media(meses.map((m) => m.saidas)));
    const saldoMedio = arredondar(rendaMedia - gastoMedio);
    const taxaPoupanca = rendaMedia > 0 ? arredondar((saldoMedio / rendaMedia) * 100) : gastoMedio > 0 ? -100 : 0;
    const mesesPositivos = meses.filter((m) => m.saldo > 0).length;

    // Limite de todos os cartões somados
    const limiteTotal = faturas.reduce((s, f) => s + f.cartao.limite, 0);
    const limiteUtilizado = faturas.reduce((s, f) => s + f.limiteUtilizado, 0);
    const usoLimite = limiteTotal > 0 ? arredondar((limiteUtilizado / limiteTotal) * 100) : null;

    const cartoes = faturas.map((f) => ({
      id: f.cartao.id,
      nome: f.cartao.nome,
      usoLimite: f.cartao.limite > 0 ? arredondar((f.limiteUtilizado / f.cartao.limite) * 100) : 0,
      proximaFatura: f.faturas[0]?.total ?? 0,
    }));

    // Projeção: a renda e os gastos seguem a média; as parcelas já assumidas nos
    // cartões (faturas futuras) entram como gasto certo, somado ao saldo acumulado.
    const projecao = [];
    let acumulado = 0;
    for (let k = 1; k <= MESES_PROJECAO; k++) {
      const mes = mesRelativo(k);
      const parcelasCartao = arredondar(
        faturas.reduce((s, f) => s + (f.faturas.find((x) => x.referencia === mes)?.total ?? 0), 0)
      );
      acumulado = arredondar(acumulado + saldoMedio);
      projecao.push({ mes, entradasPrevistas: rendaMedia, saidasPrevistas: gastoMedio, parcelasCartao, saldoAcumulado: acumulado });
    }

    const { nota, classificacao } = calcularNota({ taxaPoupanca, usoLimite, mesesPositivos });

    return {
      mesesAnalisados: meses,
      indicadores: {
        rendaMediaMensal: rendaMedia,
        gastoMedioMensal: gastoMedio,
        saldoMedioMensal: saldoMedio,
        taxaPoupanca,
        mesesPositivos,
        usoLimiteCartoes: usoLimite,
        reservaEmergenciaIdeal: arredondar(gastoMedio * 6),
      },
      nota,
      classificacao,
      maioresGastos: categorias.slice(0, 5),
      cartoes,
      projecao,
      dicas: gerarDicas({ rendaMedia, gastoMedio, taxaPoupanca, usoLimite, categorias, cartoes, mesesPositivos }),
    };
  },
};
