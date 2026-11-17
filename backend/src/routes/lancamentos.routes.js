import { Router } from 'express';
import { Lancamento } from '../models/lancamento.js';
import { autenticar } from '../middlewares/autenticar.js';
import {
  validarLancamento,
  validarFiltrosLancamentos,
  idPositivo,
} from '../middlewares/validacao.js';

const router = Router();

// Todas as rotas deste arquivo exigem login
router.use(autenticar);

// id inválido na URL: o recurso "não existe"
router.param('id', (req, res, next, id) => {
  if (!idPositivo(id)) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
  next();
});

function mesCorrente() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const dois = (n) => String(n).padStart(2, '0');
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  return { inicio: `${ano}-${dois(mes + 1)}-01`, fim: `${ano}-${dois(mes + 1)}-${dois(ultimoDia)}` };
}

// Categoria e fonte/destino precisam ser do usuário; a categoria precisa ter o mesmo tipo do lançamento
async function erroDeVinculo(usuarioId, { tipo, categoriaId, fonteDestinoId, totalParcelas }) {
  const categoria = await Lancamento.categoriaDoUsuario(Number(categoriaId), usuarioId);
  if (!categoria) {
    return {
      status: 404,
      corpo: { erro: 'Categoria não encontrada.', campos: { categoriaId: 'Categoria não encontrada.' } },
    };
  }
  if (categoria.tipo !== tipo) {
    const nome = (t) => (t === 'saida' ? 'saída' : 'entrada');
    return {
      status: 400,
      corpo: {
        erro: 'Dados inválidos.',
        campos: {
          categoriaId: `A categoria informada é de ${nome(categoria.tipo)}, mas o lançamento é de ${nome(tipo)}.`,
        },
      },
    };
  }
  const fonte = await Lancamento.fonteDoUsuario(Number(fonteDestinoId), usuarioId);
  if (!fonte) {
    return {
      status: 404,
      corpo: {
        erro: 'Fonte/destino não encontrada.',
        campos: { fonteDestinoId: 'Fonte/destino não encontrada.' },
      },
    };
  }
  // Parcelamento só existe para compras (saídas) no cartão de crédito
  if (Number(totalParcelas ?? 1) > 1 && (tipo !== 'saida' || fonte.tipo !== 'cartao_credito')) {
    return {
      status: 400,
      corpo: {
        erro: 'Dados inválidos.',
        campos: { totalParcelas: 'Só é possível parcelar saídas em cartão de crédito.' },
      },
    };
  }
  return null;
}

const dadosDoCorpo = (b) => ({
  tipo: b.tipo,
  descricao: b.descricao.trim(),
  valor: String(b.valor),
  data: b.data,
  categoriaId: Number(b.categoriaId),
  fonteDestinoId: Number(b.fonteDestinoId),
});

// Lista com filtros e paginação. Sem período informado, usa o mês corrente.
router.get('/', validarFiltrosLancamentos, async (req, res, next) => {
  try {
    const { inicio, fim, tipo, categoriaId, fonteDestinoId } = req.query;
    const pagina = Number(req.query.pagina ?? 1);
    const periodo = inicio === undefined && fim === undefined ? mesCorrente() : { inicio, fim };

    const resultado = await Lancamento.listar(
      req.usuarioId,
      { ...periodo, tipo, categoriaId, fonteDestinoId },
      pagina
    );
    res.json({ periodo: { inicio: periodo.inicio ?? null, fim: periodo.fim ?? null }, ...resultado });
  } catch (erro) {
    next(erro);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const lancamento = await Lancamento.buscarPorId(Number(req.params.id), req.usuarioId);
    if (!lancamento) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    res.json(lancamento);
  } catch (erro) {
    next(erro);
  }
});

router.post('/', validarLancamento, async (req, res, next) => {
  try {
    const problema = await erroDeVinculo(req.usuarioId, req.body);
    if (problema) return res.status(problema.status).json(problema.corpo);

    const dados = { usuarioId: req.usuarioId, ...dadosDoCorpo(req.body) };
    const totalParcelas = Number(req.body.totalParcelas ?? 1) || 1;

    // Compra parcelada: gera um lançamento por parcela (em transação) e devolve a 1ª
    const lancamento = totalParcelas > 1
      ? await Lancamento.criarParcelado({ ...dados, totalParcelas })
      : await Lancamento.criar(dados);
    res.status(201).json(lancamento);
  } catch (erro) {
    next(erro);
  }
});

// Edita um único lançamento (uma parcela, no caso de compras parceladas)
router.put('/:id', validarLancamento, async (req, res, next) => {
  try {
    const problema = await erroDeVinculo(req.usuarioId, { ...req.body, totalParcelas: 1 });
    if (problema) return res.status(problema.status).json(problema.corpo);

    const lancamento = await Lancamento.atualizar({
      id: Number(req.params.id),
      usuarioId: req.usuarioId,
      ...dadosDoCorpo(req.body),
    });
    if (!lancamento) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    res.json(lancamento);
  } catch (erro) {
    next(erro);
  }
});

// DELETE /api/lancamentos/:id            -> exclui só este lançamento
// DELETE /api/lancamentos/:id?todas=true -> exclui todas as parcelas da mesma compra
router.delete('/:id', async (req, res, next) => {
  try {
    const todas = req.query.todas === 'true';
    const excluidos = await Lancamento.excluir(Number(req.params.id), req.usuarioId, todas);
    if (excluidos === 0) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
});

export default router;