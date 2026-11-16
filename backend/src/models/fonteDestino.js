import { pool } from '../config/db.js';

const COLUNAS = 'id, nome, tipo, dia_fechamento, dia_vencimento, limite';

// O driver devolve NUMERIC como texto ("1500.00"), então convertemos aqui
function formatar(linha) {
  if (!linha) return null;
  return {
    id: linha.id,
    nome: linha.nome,
    tipo: linha.tipo,
    diaFechamento: linha.dia_fechamento,
    diaVencimento: linha.dia_vencimento,
    limite: linha.limite === null ? null : Number(linha.limite),
  };
}

export const FonteDestino = {
  async listar(usuarioId) {
    const { rows } = await pool.query(
      `SELECT ${COLUNAS} FROM fontes_destinos
        WHERE usuario_id = $1
        ORDER BY tipo, nome`,
      [usuarioId]
    );
    return rows.map(formatar);
  },

  async buscar(id, usuarioId) {
    const { rows } = await pool.query(
      `SELECT ${COLUNAS} FROM fontes_destinos WHERE id = $1 AND usuario_id = $2`,
      [id, usuarioId]
    );
    return formatar(rows[0]);
  },

  async criar({ usuarioId, nome, tipo, diaFechamento, diaVencimento, limite }) {
    const { rows } = await pool.query(
      `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUNAS}`,
      [usuarioId, nome, tipo, diaFechamento, diaVencimento, limite]
    );
    return formatar(rows[0]);
  },

  async atualizar({ id, usuarioId, nome, diaFechamento, diaVencimento, limite }) {
    const { rows } = await pool.query(
      `UPDATE fontes_destinos
          SET nome = $3, dia_fechamento = $4, dia_vencimento = $5, limite = $6
        WHERE id = $1 AND usuario_id = $2
        RETURNING ${COLUNAS}`,
      [id, usuarioId, nome, diaFechamento, diaVencimento, limite]
    );
    return formatar(rows[0]);
  },

  async excluir(id, usuarioId) {
    const resultado = await pool.query(
      'DELETE FROM fontes_destinos WHERE id = $1 AND usuario_id = $2',
      [id, usuarioId]
    );
    return resultado.rowCount > 0;
  },
};