import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { pool } from './config/db.js';
import { tratarErros } from './middlewares/erros.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

const PORT = process.env.PORT || 3000;

// Configuração do CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));

// Permite receber dados em JSON
app.use(express.json());

// Rotas de autenticação
app.use('/api/auth', authRoutes);

// Rota para verificar a conexão com o banco de dados
app.get('/api/health', async (req, res, next) => {
    try {
        await pool.query('SELECT 1');

        res.json({
            status: 'ok',
            message: 'API e banco de dados funcionando corretamente.'
        });

    } catch (erro) {
        next(erro);
    }
});

// Middleware global de tratamento de erros
app.use(tratarErros);

// Inicialização do servidor
app.listen(PORT, () => {
    console.log(`API em execução na porta ${PORT}`);
});
