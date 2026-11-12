import { pool } from '../config/db.js';

export const Categoria = {
  async listar(usuarioId) {
    const { rows } = await pool.query(
      'SELECT id, nome, tipo FROM categorias WHERE usuario_id = $1 ORDER BY tipo, nome',
      [usuarioId]
    );
    return rows;
  },

  async criar({ usuarioId, nome, tipo }) {
    const { rows } = await pool.query(
      `INSERT INTO categorias (usuario_id, nome, tipo)
       VALUES ($1, $2, $3)
       RETURNING id, nome, tipo`,
      [usuarioId, nome, tipo]
    );
    return rows[0];
  },

  // Só altera se a categoria for do usuário. Se não for, retorna undefined.
  async atualizar({ id, usuarioId, nome }) {
    const { rows } = await pool.query(
      `UPDATE categorias SET nome = $1
       WHERE id = $2 AND usuario_id = $3
       RETURNING id, nome, tipo`,
      [nome, id, usuarioId]
    );
    return rows[0];
  },

  // Retorna true se excluiu, false se não achou (ou é de outro usuário).
  async excluir(id, usuarioId) {
    const { rowCount } = await pool.query(
      'DELETE FROM categorias WHERE id = $1 AND usuario_id = $2',
      [id, usuarioId]
    );
    return rowCount > 0;
  },
};