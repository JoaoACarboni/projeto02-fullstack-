import { Router } from 'express';
import { FonteDestino } from '../models/fonteDestino.js';
import { autenticar } from '../middlewares/autenticar.js';
import { validarFonteDestino } from '../middlewares/validacao.js';

const router = Router();

// Todas as rotas deste arquivo exigem login
router.use(autenticar);

// Monta os dados a partir do corpo da requisição.
// Só o cartão de crédito usa fechamento, vencimento e limite; nos outros tipos ficam null.
function montarDados(body) {
  const ehCartao = body.tipo === 'cartao_credito';
  return {
    nome: body.nome.trim(),
    tipo: body.tipo,
    diaFechamento: ehCartao ? Number(body.diaFechamento) : null,
    diaVencimento: ehCartao ? Number(body.diaVencimento) : null,
    limite: ehCartao ? Number(body.limite) : null,
  };
}

const erroNomeDuplicado = {
  erro: 'Fonte/destino já cadastrado.',
  campos: { nome: 'Você já possui uma fonte/destino com este nome.' },
};

router.get('/', async (req, res, next) => {
  try {
    const lista = await FonteDestino.listar(req.usuarioId);
    res.json(lista);
  } catch (erro) {
    next(erro);
  }
});

router.post('/', validarFonteDestino, async (req, res, next) => {
  try {
    const fonte = await FonteDestino.criar({
      usuarioId: req.usuarioId,
      ...montarDados(req.body),
    });
    res.status(201).json(fonte);
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(409).json(erroNomeDuplicado);
    }
    next(erro);
  }
});

router.put('/:id', validarFonteDestino, async (req, res, next) => {
  try {
    const fonte = await FonteDestino.atualizar({
      id: Number(req.params.id),
      usuarioId: req.usuarioId,
      ...montarDados(req.body),
    });
    if (!fonte) {
      return res.status(404).json({ erro: 'Fonte/destino não encontrado.' });
    }
    res.json(fonte);
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(409).json(erroNomeDuplicado);
    }
    next(erro);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const excluiu = await FonteDestino.excluir(Number(req.params.id), req.usuarioId);
    if (!excluiu) {
      return res.status(404).json({ erro: 'Fonte/destino não encontrado.' });
    }
    res.status(204).send();
  } catch (erro) {
    if (erro.code === '23503') {
      return res.status(409).json({
        erro: 'Esta fonte/destino possui lançamentos e não pode ser excluída.',
      });
    }
    next(erro);
  }
});

export default router;