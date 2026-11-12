import { Router } from 'express';
import { Categoria } from '../models/categoria.js';
import { autenticar } from '../middlewares/autenticar.js';
import { validarCategoria } from '../middlewares/validacao.js';

const router = Router();

// Todas as rotas deste arquivo exigem login
router.use(autenticar);

router.get('/', async (req, res, next) => {
  try {
    const categorias = await Categoria.listar(req.usuarioId);
    res.json(categorias);
  } catch (erro) {
    next(erro);
  }
});

router.post('/', validarCategoria, async (req, res, next) => {
  try {
    const categoria = await Categoria.criar({
      usuarioId: req.usuarioId,
      nome: req.body.nome.trim(),
      tipo: req.body.tipo,
    });
    res.status(201).json(categoria);
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(409).json({
        erro: 'Categoria já cadastrada.',
        campos: { nome: 'Você já possui uma categoria com este nome e tipo.' },
      });
    }
    next(erro);
  }
});

router.put('/:id', validarCategoria, async (req, res, next) => {
  try {
    const categoria = await Categoria.atualizar({
      id: Number(req.params.id),
      usuarioId: req.usuarioId,
      nome: req.body.nome.trim(),
    });
    if (!categoria) {
      return res.status(404).json({ erro: 'Categoria não encontrada.' });
    }
    res.json(categoria);
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(409).json({
        erro: 'Categoria já cadastrada.',
        campos: { nome: 'Você já possui uma categoria com este nome e tipo.' },
      });
    }
    next(erro);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const excluiu = await Categoria.excluir(Number(req.params.id), req.usuarioId);
    if (!excluiu) {
      return res.status(404).json({ erro: 'Categoria não encontrada.' });
    }
    res.status(204).send();
  } catch (erro) {
    if (erro.code === '23503') {
      return res.status(409).json({
        erro: 'Esta categoria possui lançamentos e não pode ser excluída.',
      });
    }
    next(erro);
  }
});

export default router;