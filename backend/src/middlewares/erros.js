// Nenhuma rota respondeu: 404 em JSON (em vez da página HTML padrão do Express)
export function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

// Tratamento de erros centralizado. Deve ser registrado depois de todas as rotas.
export function tratarErros(erro, req, res, next) {
  // Corpo da requisição com JSON malformado (lançado pelo express.json())
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }

  console.error(erro);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
}
