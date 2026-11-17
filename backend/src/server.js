import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './config/db.js';
import { tratarErros, rotaNaoEncontrada } from './middlewares/erros.js';
import authRoutes from './routes/auth.routes.js';
import categoriasRoutes from './routes/categorias.routes.js';
import fontesDestinosRoutes from './routes/fontesDestinos.routes.js';
import lancamentosRoutes from './routes/lancamentos.routes.js';
import relatoriosRoutes from './routes/relatorios.routes.js';
import saudeFinanceiraRoutes from './routes/saudeFinanceira.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS restrito à origem do front-end
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));

// Permite receber dados em JSON
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/fontes-destinos', fontesDestinosRoutes);
app.use('/api/lancamentos', lancamentosRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/saude-financeira', saudeFinanceiraRoutes);

// Testa a conexão com o banco de dados
app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', message: 'API e banco de dados funcionando corretamente.' });
  } catch (erro) {
    next(erro);
  }
});

// Sempre depois de todas as rotas
app.use(rotaNaoEncontrada);
app.use(tratarErros);

app.listen(PORT, () => {
  console.log(`API em execução na porta ${PORT}`);
});
