import { pool } from '../config/db.js';

// As colunas do banco são snake_case; aqui devolvemos camelCase para o JSON
const COLUNAS = `id, nome, tipo,
  dia_fechamento AS "diaFechamento",
  dia_vencimento AS "diaVencimento",
  limite`;

// O pg devolve NUMERIC como texto ("1500.00"), então convertemos para número
function formatar(linha) {
  if (linha && linha.limite !== null) {
    linha.limite = Number(linha.limite);
  }
  return linha;
}

export const FonteDestino = {
  async listar(usuarioId) {
    const { rows } = await pool.query(
      `SELECT ${COLUNAS} FROM fontes_destinos
       WHERE usuario_id = $1 ORDER BY tipo, nome`,
      [usuarioId]
    );
    return rows.map(formatar);
  },

  async criar({ usuarioId, nome, tipo, diaFechamento, diaVencimento, limite }) {
    const { rows } = await pool.query(
      `INSERT INTO fontes_destinos
         (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUNAS}`,
      [usuarioId, nome, tipo, diaFechamento, diaVencimento, limite]
    );
    return formatar(rows[0]);
  },

  // Só altera se for do usuário. Se não for, retorna undefined.
  async atualizar({ id, usuarioId, nome, tipo, diaFechamento, diaVencimento, limite }) {
    const { rows } = await pool.query(
      `UPDATE fontes_destinos
       SET nome = $1, tipo = $2, dia_fechamento = $3, dia_vencimento = $4, limite = $5
       WHERE id = $6 AND usuario_id = $7
       RETURNING ${COLUNAS}`,
      [nome, tipo, diaFechamento, diaVencimento, limite, id, usuarioId]
    );
    return formatar(rows[0]);
  },

  // Retorna true se excluiu, false se não achou (ou é de outro usuário).
  async excluir(id, usuarioId) {
    const { rowCount } = await pool.query(
      'DELETE FROM fontes_destinos WHERE id = $1 AND usuario_id = $2',
      [id, usuarioId]
    );
    return rowCount > 0;
  },
};