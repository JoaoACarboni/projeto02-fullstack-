import { Router } from 'express';
import { Relatorio } from '../models/relatorio.js';
import { Fatura } from '../models/fatura.js';
import { autenticar } from '../middlewares/autenticar.js';
import { validarPeriodo, validarMeses } from '../middlewares/validacao.js';

const router = Router();

// Todas as rotas deste arquivo exigem login
router.use(autenticar);

// RF7 — GET /api/relatorios/categorias?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
router.get('/categorias', validarPeriodo, async (req, res, next) => {
  try {
    const { inicio, fim } = req.query;
    res.json(await Relatorio.porCategoria(req.usuarioId, inicio, fim));
  } catch (erro) {
    next(erro);
  }
});

// RF8 — GET /api/relatorios/fontes-destinos?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
router.get('/fontes-destinos', validarPeriodo, async (req, res, next) => {
  try {
    const { inicio, fim } = req.query;
    res.json(await Relatorio.porFonteDestino(req.usuarioId, inicio, fim));
  } catch (erro) {
    next(erro);
  }
});

// RF9 — GET /api/relatorios/faturas?meses=3
// Fatura aberta + as próximas `meses` faturas (padrão 3) de cada cartão
router.get('/faturas', validarMeses, async (req, res, next) => {
  try {
    const meses = req.query.meses === undefined ? 3 : Number(req.query.meses);
    res.json(await Fatura.listar(req.usuarioId, meses));
  } catch (erro) {
    next(erro);
  }
});

export default router;
