// Cria as tabelas executando database/schema.sql no banco do DATABASE_URL.
// Uso: npm run db:criar   (pode rodar mais de uma vez: usa IF NOT EXISTS)
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { pool } from '../src/config/db.js';

const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');

try {
  await pool.query(sql);
  console.log('Tabelas criadas (ou já existentes).');
} catch (erro) {
  console.error('Erro ao criar as tabelas:', erro.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
