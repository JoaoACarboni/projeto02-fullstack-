
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

function emailValido(email) {
    if (typeof email !== 'string') return false;

    const emailLimpo = email.trim();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(emailLimpo);
}

function senhaValida(senha) {
    return (
        typeof senha === 'string' &&
        senha.length >= 8 &&
        /[A-Za-z]/.test(senha) &&
        /\d/.test(senha)
    );
}

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
