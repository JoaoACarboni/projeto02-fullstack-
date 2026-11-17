
/**
 * Valida o CPF utilizando os dígitos verificadores.
 */
function cpfValido(cpf) {
    const d = String(cpf).replace(/\D/g, '');

    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) {
        return false;
    }

    const digito = (tamanho) => {
        let soma = 0;

        for (let i = 0; i < tamanho; i++) {
            soma += Number(d[i]) * (tamanho + 1 - i);
        }

        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };

    return (
        digito(9) === Number(d[9]) &&
        digito(10) === Number(d[10])
    );
}

/**
 * Valida o formato básico de um e-mail.
 */
function emailValido(email) {
    if (typeof email !== 'string') {
        return false;
    }

    const emailLimpo = email.trim();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(emailLimpo);
}

/**
 * Verifica os requisitos mínimos da senha.
 */
function senhaValida(senha) {
    return (
        typeof senha === 'string' &&
        senha.length >= 8 &&
        /[A-Za-z]/.test(senha) &&
        /\d/.test(senha)
    );
}

/**
 * Middleware responsável por validar os dados do cadastro.
 */
export function validarCadastro(req, res, next) {
    const { nome, email, cpf, senha } = req.body ?? {};

    if (!nome || !email || !cpf || !senha) {
        return res.status(400).json({
            erro: 'Todos os campos são obrigatórios.'
        });
    }

    if (typeof nome !== 'string' || nome.trim().length < 3) {
        return res.status(400).json({
            erro: 'O nome deve possuir pelo menos 3 caracteres.'
        });
    }

    if (!emailValido(email)) {
        return res.status(400).json({
            erro: 'Informe um e-mail válido.'
        });
    }

    if (!cpfValido(cpf)) {
        return res.status(400).json({
            erro: 'Informe um CPF válido.'
        });
    }

    if (!senhaValida(senha)) {
        return res.status(400).json({
            erro: 'A senha deve ter pelo menos 8 caracteres, incluindo letras e números.'
        });
    }

    next();
}

/**
 * Valida os dados de categoria (nome e tipo).
 * Na edição só o nome é usado, porque o tipo não pode mudar.
 */
export function validarCategoria(req, res, next) {
  const { nome, tipo } = req.body ?? {};
  const campos = {};

  if (typeof nome !== 'string' || nome.trim().length < 2 || nome.trim().length > 60) {
    campos.nome = 'O nome deve ter entre 2 e 60 caracteres.';
  }

  if (req.method === 'POST' && tipo !== 'entrada' && tipo !== 'saida') {
    campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  }

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  next();
}

// Dia do mês: número inteiro de 1 a 31
function diaValido(dia) {
  const n = Number(dia);
  return Number.isInteger(n) && n >= 1 && n <= 31;
}

/**
 * Valida os dados de fonte/destino.
 * Se for cartão de crédito, exige fechamento, vencimento e limite.
 */
export function validarFonteDestino(req, res, next) {
  const { nome, tipo, diaFechamento, diaVencimento, limite } = req.body ?? {};
  const campos = {};

  if (typeof nome !== 'string' || nome.trim().length < 2 || nome.trim().length > 60) {
    campos.nome = 'O nome deve ter entre 2 e 60 caracteres.';
  }

  if (!['renda', 'conta', 'cartao_credito'].includes(tipo)) {
    campos.tipo = 'O tipo deve ser "renda", "conta" ou "cartao_credito".';
  }

  if (tipo === 'cartao_credito') {
    if (!diaValido(diaFechamento)) {
      campos.diaFechamento = 'Informe o dia de fechamento (1 a 31).';
    }
    if (!diaValido(diaVencimento)) {
      campos.diaVencimento = 'Informe o dia de vencimento (1 a 31).';
    }
    if (!(Number(limite) > 0)) {
      campos.limite = 'Informe um limite maior que zero.';
    }
  }

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  next();
}
/**
 * Valida os dados de uma fonte/destino.
 * Retorna os erros por campo e os dados já normalizados.
 * Se o tipo for cartão de crédito, fechamento, vencimento e limite são obrigatórios.
 */
export function validarDadosFonteDestino(body, tipo) {
  const { nome, diaFechamento, diaVencimento, limite } = body ?? {};
  const campos = {};
  const dados = { nome: null, diaFechamento: null, diaVencimento: null, limite: null };

  if (typeof nome !== 'string' || nome.trim().length < 2 || nome.trim().length > 60) {
    campos.nome = 'O nome deve ter entre 2 e 60 caracteres.';
  } else {
    dados.nome = nome.trim();
  }

  if (!['renda', 'conta', 'cartao_credito'].includes(tipo)) {
    campos.tipo = 'O tipo deve ser "renda", "conta" ou "cartao_credito".';
  }

  if (tipo === 'cartao_credito') {
    const fechamento = Number(diaFechamento);
    const vencimento = Number(diaVencimento);
    const valorLimite = Number(limite);

    if (!Number.isInteger(fechamento) || fechamento < 1 || fechamento > 31) {
      campos.diaFechamento = 'O dia de fechamento deve ser de 1 a 31.';
    } else {
      dados.diaFechamento = fechamento;
    }

    if (!Number.isInteger(vencimento) || vencimento < 1 || vencimento > 31) {
      campos.diaVencimento = 'O dia de vencimento deve ser de 1 a 31.';
    } else {
      dados.diaVencimento = vencimento;
    }

    if (!Number.isFinite(valorLimite) || valorLimite <= 0 || valorLimite > 9999999999.99) {
      campos.limite = 'Informe um limite maior que zero.';
    } else {
      dados.limite = Math.round(valorLimite * 100) / 100;
    }
  }

  return { campos, dados };
}

// ---------- Lançamentos ----------

export function dataIsoValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const d = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valor;
}

export const idPositivo = (v) => /^\d+$/.test(String(v)) && Number(v) > 0;

// Valida o corpo do POST e do PUT de lançamentos
export function validarLancamento(req, res, next) {
  const { tipo, descricao, valor, data, categoriaId, fonteDestinoId } = req.body ?? {};
  const campos = {};

  if (tipo !== 'entrada' && tipo !== 'saida') {
    campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  }
  if (typeof descricao !== 'string' || descricao.trim().length < 1 || descricao.trim().length > 120) {
    campos.descricao = 'A descrição deve ter entre 1 e 120 caracteres.';
  }
  // Regex em vez de float: aceita até 2 casas decimais, sem erro de arredondamento
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(String(valor ?? '')) || Number(valor) <= 0) {
    campos.valor = 'O valor deve ser maior que zero, com até 2 casas decimais.';
  }
  if (!dataIsoValida(data)) {
    campos.data = 'Informe uma data válida (AAAA-MM-DD).';
  }
  if (!idPositivo(categoriaId)) campos.categoriaId = 'Informe a categoria.';
  if (!idPositivo(fonteDestinoId)) campos.fonteDestinoId = 'Informe a fonte/destino.';

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }
  next();
}

// Valida os filtros do GET /api/lancamentos
export function validarFiltrosLancamentos(req, res, next) {
  const { inicio, fim, tipo, categoriaId, fonteDestinoId, pagina } = req.query;
  const campos = {};

  if (inicio !== undefined && !dataIsoValida(inicio)) campos.inicio = 'Data inicial inválida.';
  if (fim !== undefined && !dataIsoValida(fim)) campos.fim = 'Data final inválida.';
  if (!campos.inicio && !campos.fim && inicio && fim && inicio > fim) {
    campos.fim = 'A data final deve ser igual ou posterior à inicial.';
  }
  if (tipo !== undefined && tipo !== 'entrada' && tipo !== 'saida') {
    campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  }
  if (categoriaId !== undefined && !idPositivo(categoriaId)) campos.categoriaId = 'Categoria inválida.';
  if (fonteDestinoId !== undefined && !idPositivo(fonteDestinoId)) campos.fonteDestinoId = 'Fonte/destino inválida.';
  if (pagina !== undefined && !idPositivo(pagina)) campos.pagina = 'Página inválida.';

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Filtros inválidos.', campos });
  }
  next();
}

// Confere se o texto é uma data real no formato AAAA-MM-DD
function dataValida(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return false;
  }
  const data = new Date(texto + 'T00:00:00Z');
  // Se o dia não existe (ex.: 2026-02-31), o JS ajusta a data e o texto deixa de bater
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === texto;
}

/**
 * Valida o período dos relatórios (?inicio=AAAA-MM-DD&fim=AAAA-MM-DD).
 */
export function validarPeriodo(req, res, next) {
  const { inicio, fim } = req.query;
  const campos = {};

  if (!dataValida(inicio)) {
    campos.inicio = 'Informe a data inicial no formato AAAA-MM-DD.';
  }
  if (!dataValida(fim)) {
    campos.fim = 'Informe a data final no formato AAAA-MM-DD.';
  }
  // Datas nesse formato podem ser comparadas como texto
  if (!campos.inicio && !campos.fim && inicio > fim) {
    campos.fim = 'A data final deve ser igual ou posterior à data inicial.';
  }

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({ erro: 'Dados inválidos.', campos });
  }

  next();
}