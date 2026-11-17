import { pool } from '../config/db.js';
import { randomUUID } from 'node:crypto';

const POR_PAGINA = 10;

// to_char evita que a data "ande" um dia por causa de fuso horário
const SELECT = `
  SELECT l.id, l.tipo, l.descricao, l.valor,
         to_char(l.data, 'YYYY-MM-DD') AS data,
         l.categoria_id AS "categoriaId", c.nome AS categoria,
         l.fonte_destino_id AS "fonteDestinoId", f.nome AS "fonteDestino",
         f.tipo AS "tipoFonteDestino",
         l.parcela_atual AS "parcelaAtual", l.total_parcelas AS "totalParcelas",
         l.grupo_parcelamento AS "grupoParcelamento"
    FROM lancamentos l
    JOIN categorias c ON c.id = l.categoria_id
    JOIN fontes_destinos f ON f.id = l.fonte_destino_id`;

// O pg devolve NUMERIC como texto; convertemos para número antes de enviar
function formatar(lancamento) {
  return lancamento && { ...lancamento, valor: Number(lancamento.valor) };
}

// '100.5' -> 10050. Converte o texto direto, sem passar por float.
function paraCentavos(valor) {
  const [reais, centavos = ''] = String(valor).split('.');
  return Number(reais) * 100 + Number(centavos.padEnd(2, '0'));
}

// 3334 -> '33.34' (texto, gravado no NUMERIC sem erro de arredondamento)
function deCentavos(centavos) {
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, '0')}`;
}

// Divide o valor em N parcelas, em centavos. A sobra do arredondamento vai para a 1ª.
// Ex.: '100.00' em 3x -> ['33.34', '33.33', '33.33']
export function dividirEmParcelas(valor, totalParcelas) {
  const total = paraCentavos(valor);
  const base = Math.floor(total / totalParcelas);
  const sobra = total - base * totalParcelas;
  return Array.from({ length: totalParcelas }, (_, i) => deCentavos(i === 0 ? base + sobra : base));
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
      totais: { entradas: Number(entradas), saidas: Number(saidas), saldo: Number(saldo) },
      paginacao: {
        pagina,
        porPagina: POR_PAGINA,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
      },
      lancamentos: rows.map(formatar),
    };
  },

  async buscarPorId(id, usuarioId) {
    const { rows } = await pool.query(`${SELECT} WHERE l.id = $1 AND l.usuario_id = $2`, [id, usuarioId]);
    return formatar(rows[0]);
  },

  async criar({ usuarioId, tipo, descricao, valor, data, categoriaId, fonteDestinoId }) {
    // parcela_atual e total_parcelas ficam com o DEFAULT 1
    const { rows } = await pool.query(
      `INSERT INTO lancamentos (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [usuarioId, tipo, descricao, valor, data, categoriaId, fonteDestinoId]
    );
    return Lancamento.buscarPorId(rows[0].id, usuarioId);
  },

  // Cria uma compra parcelada: uma linha por parcela, todas ou nenhuma (transação).
  // Todas as parcelas guardam a data da compra; a fatura de cada uma é calculada
  // com calcularFatura(data, cartao, parcela_atual) — veja models/fatura.js.
  async criarParcelado({ usuarioId, tipo, descricao, valor, data, categoriaId, fonteDestinoId, totalParcelas }) {
    const valores = dividirEmParcelas(valor, totalParcelas);
    const grupo = randomUUID(); // o mesmo código para todas as parcelas da compra

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const ids = [];
      for (let parcela = 1; parcela <= totalParcelas; parcela++) {
        const { rows } = await client.query(
          `INSERT INTO lancamentos
             (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id,
              parcela_atual, total_parcelas, grupo_parcelamento)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [usuarioId, tipo, descricao, valores[parcela - 1], data, categoriaId, fonteDestinoId,
           parcela, totalParcelas, grupo]
        );
        ids.push(rows[0].id);
      }

      await client.query('COMMIT');
      return Lancamento.buscarPorId(ids[0], usuarioId);
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

  // Exclui um lançamento. Com todas = true, se ele for uma parcela, exclui todas as
  // parcelas da mesma compra. Retorna quantos foram excluídos (0 = não encontrado).
  async excluir(id, usuarioId, todas = false) {
    if (todas) {
      const { rowCount } = await pool.query(
        `DELETE FROM lancamentos
          WHERE usuario_id = $2
            AND (id = $1 OR grupo_parcelamento = (
                  SELECT grupo_parcelamento FROM lancamentos WHERE id = $1 AND usuario_id = $2))`,
        [id, usuarioId]
      );
      return rowCount;
    }
    const { rowCount } = await pool.query(
      'DELETE FROM lancamentos WHERE id = $1 AND usuario_id = $2',
      [id, usuarioId]
    );
    return rowCount;
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
      'SELECT id, tipo FROM fontes_destinos WHERE id = $1 AND usuario_id = $2',
      [id, usuarioId]
    );
    return rows[0];
  },
};
