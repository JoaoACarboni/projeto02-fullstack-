import { Router } from 'express';
import { SaudeFinanceira } from '../models/saudeFinanceira.js';
import { autenticar } from '../middlewares/autenticar.js';

const router = Router();

router.use(autenticar);

// Desafio — GET /api/saude-financeira
// Indicadores, nota, projeção dos próximos meses e dicas, a partir dos dados do usuário
router.get('/', async (req, res, next) => {
  try {
    res.json(await SaudeFinanceira.analisar(req.usuarioId));
  } catch (erro) {
    next(erro);
  }
});

export default router;
