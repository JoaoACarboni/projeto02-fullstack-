import { pool } from '../config/db.js';

// ---------- Regra de fechamento (função pura, do enunciado) ----------

function ultimoDiaDoMes(ano, mes) {              // mes: 0 a 11
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

// Aceita mes > 11 (vira o ano seguinte) e ajusta dia 31 em meses curtos
function dataSegura(ano, mes, dia) {
  const a = ano + Math.floor(mes / 12);
  const m = ((mes % 12) + 12) % 12;
  return new Date(Date.UTC(a, m, Math.min(dia, ultimoDiaDoMes(a, m))));
}

// dataCompra: 'AAAA-MM-DD'; cartao: { diaFechamento, diaVencimento }
export function calcularFatura(dataCompra, cartao, numeroParcela = 1) {
  const [ano, mes, dia] = dataCompra.split('-').map(Number);
  const m = mes - 1;
  const fechamentoDoMes = Math.min(cartao.diaFechamento, ultimoDiaDoMes(ano, m));

  // Antes do fechamento: fatura deste mês. No dia do fechamento ou depois: mês seguinte.
  let mesFechamento = dia < fechamentoDoMes ? m : m + 1;
  mesFechamento += numeroParcela - 1;            // cada parcela cai um mês depois

  const fechamento = dataSegura(ano, mesFechamento, cartao.diaFechamento);
  const mesVencimento = cartao.diaVencimento > cartao.diaFechamento ? mesFechamento : mesFechamento + 1;
  const vencimento = dataSegura(ano, mesVencimento, cartao.diaVencimento);

  const iso = (d) => d.toISOString().slice(0, 10);
  return { referencia: iso(vencimento).slice(0, 7), fechamento: iso(fechamento), vencimento: iso(vencimento) };
}

// ---------- Auxiliares ----------

function arredondar(n) {
  return Math.round(n * 100) / 100;
}

// Data de hoje como 'AAAA-MM-DD' (no horário do servidor)
function dataHoje() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// ---------- Consulta ----------

export const Fatura = {
  // Fatura atual + as próximas `meses` faturas de cada cartão do usuário
  async listar(usuarioId, meses) {
    const hoje = dataHoje();

    const { rows: cartoes } = await pool.query(
      `SELECT id, nome, dia_fechamento, dia_vencimento, limite
       FROM fontes_destinos
       WHERE usuario_id = $1 AND tipo = 'cartao_credito'
       ORDER BY nome`,
      [usuarioId]
    );

    const resultado = [];

    for (const c of cartoes) {
      const cartao = { diaFechamento: c.dia_fechamento, diaVencimento: c.dia_vencimento };

      // to_char devolve a data como texto, para o fuso horário não mudar o dia
      const { rows } = await pool.query(
        `SELECT id, descricao, valor, to_char(data, 'YYYY-MM-DD') AS data,
                parcela_atual, total_parcelas
         FROM lancamentos
         WHERE usuario_id = $1 AND fonte_destino_id = $2 AND tipo = 'saida'
         ORDER BY data, id`,
        [usuarioId, c.id]
      );

      // Descobre em qual fatura cai cada lançamento
      const lancamentos = rows.map((l) => ({
        id: l.id,
        descricao: l.descricao,
        valor: Number(l.valor),
        data: l.data,
        parcela: `${l.parcela_atual}/${l.total_parcelas}`,
        fatura: calcularFatura(l.data, cartao, l.parcela_atual),
      }));

      // Limite utilizado = tudo que ainda não venceu (inclui parcelas futuras)
      const limiteTotal = Number(c.limite);
      const utilizado = arredondar(
        lancamentos
          .filter((l) => l.fatura.vencimento >= hoje)
          .reduce((soma, l) => soma + l.valor, 0)
      );

      // Uma compra feita hoje cai na fatura aberta; a parcela k+1 cai k meses depois.
      // Por isso calcularFatura(hoje, cartao, k + 1) dá a fatura de cada mês.
      const faturas = [];
      for (let k = 0; k <= meses; k++) {
        const datas = calcularFatura(hoje, cartao, k + 1);
        const itens = lancamentos.filter((l) => l.fatura.referencia === datas.referencia);

        faturas.push({
          referencia: datas.referencia,
          fechamento: datas.fechamento,
          vencimento: datas.vencimento,
          aberta: k === 0,
          total: arredondar(itens.reduce((soma, l) => soma + l.valor, 0)),
          lancamentos: itens.map((l) => ({
            id: l.id,
            descricao: l.descricao,
            valor: l.valor,
            data: l.data,
            parcela: l.parcela,
          })),
        });
      }

      resultado.push({
        cartao: {
          id: c.id,
          nome: c.nome,
          diaFechamento: c.dia_fechamento,
          diaVencimento: c.dia_vencimento,
          limite: limiteTotal,
        },
        limiteUtilizado: utilizado,
        limiteDisponivel: arredondar(limiteTotal - utilizado),
        faturas,
      });
    }

    return resultado;
  },
};