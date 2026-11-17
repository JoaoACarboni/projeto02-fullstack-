import { pool } from '../config/db.js';

// O banco devolve SUM como texto e somas em JS podem dar 0.30000000000000004,
// então arredondamos em 2 casas
function arredondar(n) {
  return Math.round(n * 100) / 100;
}

function somar(lista) {
  return arredondar(lista.reduce((soma, item) => soma + item.total, 0));
}

// Período anterior com o MESMO tamanho. Ex.: 01/10 a 31/10 (31 dias) -> 30/08 a 30/09.
// Usamos UTC para o fuso horário não mudar o dia.
function periodoAnterior(inicio, fim) {
  const dia = 24 * 60 * 60 * 1000;
  const ini = new Date(inicio + 'T00:00:00Z');
  const f = new Date(fim + 'T00:00:00Z');
  const dias = Math.round((f - ini) / dia) + 1;

  return {
    inicio: new Date(ini.getTime() - dias * dia).toISOString().slice(0, 10),
    fim: new Date(ini.getTime() - dia).toISOString().slice(0, 10),
  };
}

// Total por categoria de um tipo (entrada ou saida) em um período.
// A soma é feita no banco (GROUP BY + SUM), como o enunciado pede.
async function totaisPorCategoria(usuarioId, tipo, inicio, fim) {
  const { rows } = await pool.query(
    `SELECT c.id, c.nome, SUM(l.valor) AS total
     FROM lancamentos l
     JOIN categorias c ON c.id = l.categoria_id
     WHERE l.usuario_id = $1
       AND l.tipo = $2
       AND l.data BETWEEN $3 AND $4
     GROUP BY c.id, c.nome
     ORDER BY total DESC`,
    [usuarioId, tipo, inicio, fim]
  );
  return rows.map((linha) => ({ id: linha.id, nome: linha.nome, total: Number(linha.total) }));
}

// Junta o período atual com o anterior e calcula o percentual de cada categoria
function montarLista(atual, anterior) {
  const totalGeral = somar(atual);

  return atual.map((cat) => {
    const antes = anterior.find((a) => a.id === cat.id);
    return {
      id: cat.id,
      nome: cat.nome,
      total: cat.total,
      percentual: totalGeral > 0 ? arredondar((cat.total / totalGeral) * 100) : 0,
      periodoAnterior: antes ? antes.total : 0,
    };
  });
}

export const Relatorio = {
  // RF7
  async porCategoria(usuarioId, inicio, fim) {
    const anterior = periodoAnterior(inicio, fim);

    const saidas = await totaisPorCategoria(usuarioId, 'saida', inicio, fim);
    const saidasAnt = await totaisPorCategoria(usuarioId, 'saida', anterior.inicio, anterior.fim);
    const entradas = await totaisPorCategoria(usuarioId, 'entrada', inicio, fim);
    const entradasAnt = await totaisPorCategoria(usuarioId, 'entrada', anterior.inicio, anterior.fim);

    return {
      periodo: { inicio, fim },
      periodoComparacao: anterior,
      totalSaidas: somar(saidas),
      categorias: montarLista(saidas, saidasAnt),
      totalEntradas: somar(entradas),
      entradas: montarLista(entradas, entradasAnt),
    };
  },

  // RF8
  async porFonteDestino(usuarioId, inicio, fim) {
    // LEFT JOIN: traz também as fontes sem movimento no período (total 0)
    const { rows } = await pool.query(
      `SELECT f.id, f.nome, f.tipo,
              COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor END), 0) AS entradas,
              COALESCE(SUM(CASE WHEN l.tipo = 'saida' THEN l.valor END), 0) AS saidas
       FROM fontes_destinos f
       LEFT JOIN lancamentos l
         ON l.fonte_destino_id = f.id AND l.data BETWEEN $2 AND $3
       WHERE f.usuario_id = $1
       GROUP BY f.id, f.nome, f.tipo
       ORDER BY f.tipo, f.nome`,
      [usuarioId, inicio, fim]
    );

    const fontes = rows.map((linha) => {
      const entradas = Number(linha.entradas);
      const saidas = Number(linha.saidas);
      return {
        id: linha.id,
        nome: linha.nome,
        tipo: linha.tipo,
        entradas,
        saidas,
        // O saldo só faz sentido para contas (entradas - saídas)
        saldo: linha.tipo === 'conta' ? arredondar(entradas - saidas) : null,
      };
    });

    return {
      periodo: { inicio, fim },
      totalEntradas: somar(fontes.map((f) => ({ total: f.entradas }))),
      totalSaidas: somar(fontes.map((f) => ({ total: f.saidas }))),
      fontesDestinos: fontes,
    };
  },
};