import { pool } from '../config/db.js';
import { randomUUID } from 'node:crypto';

const POR_PAGINA = 10;

// to_char evita que a data "ande" um dia por causa de fuso horário
const SELECT = `
  SELECT l.id, l.tipo, l.descricao, l.valor,
         to_char(l.data, 'YYYY-MM-DD') AS data,
         l.categoria_id AS "categoriaId", c.nome AS categoria,
         l.fonte_destino_id AS "fonteDestinoId", f.nome AS "fonteDestino",
         l.parcela_atual AS "parcelaAtual", l.total_parcelas AS "totalParcelas"
    FROM lancamentos l
    JOIN categorias c ON c.id = l.categoria_id
    JOIN fontes_destinos f ON f.id = l.fonte_destino_id`;

// O pg devolve NUMERIC como texto; convertemos para número antes de enviar
function formatar(lancamento) {
  return lancamento && { ...lancamento, valor: Number(lancamento.valor) };
}

// Monta o WHERE com parâmetros ($1, $2...), nunca concatenando texto do usuário
function montarFiltro(usuarioId, filtros) {
  const condicoes = ['l.usuario_id = $1'];
  const params = [usuarioId];
  const adicionar = (sql, valor) => {
    params.push(valor);
    condicoes.push(sql.replace('?', `$${params.length}`));
  };

  if (filtros.inicio) adicionar('l.data >= ?', filtros.inicio);
  if (filtros.fim) adicionar('l.data <= ?', filtros.fim);
  if (filtros.tipo) adicionar('l.tipo = ?', filtros.tipo);
  if (filtros.categoriaId) adicionar('l.categoria_id = ?', Number(filtros.categoriaId));
  if (filtros.fonteDestinoId) adicionar('l.fonte_destino_id = ?', Number(filtros.fonteDestinoId));

  return { where: condicoes.join(' AND '), params };
}

export const Lancamento = {
  async listar(usuarioId, filtros, pagina) {
    const { where, params } = montarFiltro(usuarioId, filtros);

    // Totais calculados no banco, sobre TODO o período filtrado (não só a página)
    const resumo = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'entrada'), 0) AS entradas,
              COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'saida'), 0) AS saidas,
              COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor ELSE -l.valor END), 0) AS saldo
         FROM lancamentos l
        WHERE ${where}`,
      params
    );
    const { total, entradas, saidas, saldo } = resumo.rows[0];

    const n = params.length;
    const { rows } = await pool.query(
      `${SELECT}
        WHERE ${where}
        ORDER BY l.data DESC, l.id DESC
        LIMIT $${n + 1} OFFSET $${n + 2}`,
      [...params, POR_PAGINA, (pagina - 1) * POR_PAGINA]
    );

    return {
      totais: { entradas, saidas, saldo },
      paginacao: {
        pagina,
        porPagina: POR_PAGINA,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
      },
      lancamentos: rows,
    };
  },

  async buscarPorId(id, usuarioId) {
    const { rows } = await pool.query(`${SELECT} WHERE l.id = $1 AND l.usuario_id = $2`, [id, usuarioId]);
    return rows[0];
  },

  async criar({ usuarioId, tipo, descricao, valor, data, categoriaId, fonteDestinoId }) {
    // parcela_atual e total_parcelas ficam com o DEFAULT 1 (parcelamento: veja o README)
    const { rows } = await pool.query(
      `INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [usuarioId, tipo, descricao, valor, data, categoriaId, fonteDestinoId]
    );
    return Lancamento.buscarPorId(rows[0].id, usuarioId);
  },
    // Cria uma compra parcelada: uma linha por parcela, todas ou nenhuma (transação)
  async criarParcelado({ usuarioId, tipo, descricao, valor, data, categoriaId, fonteDestinoId, totalParcelas }) {
    // Trabalhamos em centavos (números inteiros) para não ter erro de arredondamento
    const totalCentavos = Math.round(valor * 100);
    const base = Math.floor(totalCentavos / totalParcelas);
    const sobra = totalCentavos - base * totalParcelas;   // a diferença vai para a 1ª parcela

    const grupo = randomUUID();   // o mesmo código para todas as parcelas da compra
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let primeiroId;
      for (let parcela = 1; parcela <= totalParcelas; parcela++) {
        const centavos = parcela === 1 ? base + sobra : base;
        const { rows } = await client.query(
          `INSERT INTO lancamentos
             (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id,
              parcela_atual, total_parcelas, grupo_parcelamento)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [usuarioId, tipo, descricao, centavos / 100, data, categoriaId, fonteDestinoId,
           parcela, totalParcelas, grupo]
        );
        if (parcela === 1) primeiroId = rows[0].id;
      }

      await client.query('COMMIT');
      return Lancamento.buscarPorId(primeiroId, usuarioId);
    } catch (erro) {
      await client.query('ROLLBACK');
      throw erro;
    } finally {
      client.release();
    }
  },

  async atualizar({ id, usuarioId, tipo, descricao, valor, data, categoriaId, fonteDestinoId }) {
    const { rows } = await pool.query(
      `UPDATE lancamentos
          SET tipo = $3, descricao = $4, valor = $5, data = $6,
              categoria_id = $7, fonte_destino_id = $8
        WHERE id = $1 AND usuario_id = $2
        RETURNING id`,
      [id, usuarioId, tipo, descricao, valor, data, categoriaId, fonteDestinoId]
    );
    if (!rows[0]) return undefined;
    return Lancamento.buscarPorId(id, usuarioId);
  },

  async excluir(id, usuarioId) {
    const { rowCount } = await pool.query(
      'DELETE FROM lancamentos WHERE id = $1 AND usuario_id = $2',
      [id, usuarioId]
    );
    return rowCount > 0;
  },

  // Usadas para garantir que categoria e fonte/destino pertencem ao usuário (RF3)
  async categoriaDoUsuario(id, usuarioId) {
    const { rows } = await pool.query(
      'SELECT id, tipo FROM categorias WHERE id = $1 AND usuario_id = $2',
      [id, usuarioId]
    );
    return rows[0];
  },

  async fonteDoUsuario(id, usuarioId) {
    const { rows } = await pool.query(
      'SELECT id FROM fontes_destinos WHERE id = $1 AND usuario_id = $2',
      [id, usuarioId]
    );
    return rows[0];
  },
};