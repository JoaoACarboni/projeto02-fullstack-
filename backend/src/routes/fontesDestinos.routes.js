import { Router } from 'express';
import { FonteDestino } from '../models/fonteDestino.js';
import { autenticar } from '../middlewares/autenticar.js';
import { validarDadosFonteDestino } from '../middlewares/validacao.js';

const router = Router();

// Todas as rotas deste arquivo exigem login
router.use(autenticar);

const erroNomeDuplicado = {
  erro: 'Fonte/destino já cadastrado.',
  campos: { nome: 'Você já possui uma fonte/destino com este nome.' },
};

router.get('/', async (req, res, next) => {
  try {
    res.json(await FonteDestino.listar(req.usuarioId));
  } catch (erro) {
    next(erro);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const tipo = req.body?.tipo;
    const { campos, dados } = validarDadosFonteDestino(req.body, tipo);
    if (Object.keys(campos).length > 0) {
      return res.status(400).json({ erro: 'Dados inválidos.', campos });
    }

    const fonte = await FonteDestino.criar({ usuarioId: req.usuarioId, tipo, ...dados });
    res.status(201).json(fonte);
  } catch (erro) {
    if (erro.code === '23505') return res.status(409).json(erroNomeDuplicado);
    next(erro);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const atual = Number.isInteger(id) ? await FonteDestino.buscar(id, req.usuarioId) : null;
    if (!atual) {
      return res.status(404).json({ erro: 'Fonte/destino não encontrado.' });
    }

    // O tipo não muda na edição: usamos o que está salvo
    const { campos, dados } = validarDadosFonteDestino(req.body, atual.tipo);
    if (Object.keys(campos).length > 0) {
      return res.status(400).json({ erro: 'Dados inválidos.', campos });
    }

    const fonte = await FonteDestino.atualizar({ id, usuarioId: req.usuarioId, ...dados });
    res.json(fonte);
  } catch (erro) {
    if (erro.code === '23505') return res.status(409).json(erroNomeDuplicado);
    next(erro);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const excluiu = Number.isInteger(id) ? await FonteDestino.excluir(id, req.usuarioId) : false;
    if (!excluiu) {
      return res.status(404).json({ erro: 'Fonte/destino não encontrado.' });
    }
    res.status(204).send();
  } catch (erro) {
    if (erro.code === '23503') {
      return res.status(409).json({
        erro: 'Este item possui lançamentos e não pode ser excluído.',
      });
    }
    next(erro);
  }
});

export default router;