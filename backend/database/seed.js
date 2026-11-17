// Carga inicial para demonstração: 2 usuários com cartões e lançamentos dos
// 3 meses anteriores + o mês atual (inclui compras parceladas).
// Uso: npm run seed   (recria apenas os usuários de demonstração abaixo)
//
// Usa os próprios models da API, então passa pelas mesmas regras
// (categorias padrão no cadastro, parcelamento em centavos e em transação).
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';
import { Usuario } from '../src/models/usuario.js';
import { Categoria } from '../src/models/categoria.js';
import { FonteDestino } from '../src/models/fonteDestino.js';
import { Lancamento } from '../src/models/lancamento.js';

const SENHA = 'senha1234';

const USUARIOS = [
  {
    nome: 'Ana Souza',
    email: 'ana@exemplo.com',
    cpf: '39053344705',
    salario: 6500,
    cartoes: [
      { nome: 'Nubank', diaFechamento: 3, diaVencimento: 10, limite: 4000 },
      { nome: 'Visa crédito', diaFechamento: 25, diaVencimento: 5, limite: 6000 },
    ],
  },
  {
    nome: 'Bruno Lima',
    email: 'bruno@exemplo.com',
    cpf: '71460218310',
    salario: 4200,
    cartoes: [{ nome: 'Inter', diaFechamento: 15, diaVencimento: 22, limite: 2500 }],
  },
];

// 'AAAA-MM-DD' do dia `dia` em (mês atual + k)
function data(k, dia) {
  const hoje = new Date();
  const d = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth() + k, Math.min(dia, 28)));
  return d.toISOString().slice(0, 10);
}

// Valores "quebrados" que variam de mês para mês, sempre com 2 casas
function variar(base, k, passo) {
  return (base + ((k * 37) % 5) * passo).toFixed(2);
}

async function criarUsuario(u) {
  await Usuario.excluirPorEmail(u.email);
  const senhaHash = await bcrypt.hash(SENHA, 10);
  const usuario = await Usuario.criarComPadroes({ nome: u.nome, email: u.email, cpf: u.cpf, senhaHash });

  // Fontes/destinos extras além dos padrão (Conta corrente e Salário)
  await FonteDestino.criar({ usuarioId: usuario.id, nome: 'Poupança', tipo: 'conta' });
  await FonteDestino.criar({ usuarioId: usuario.id, nome: 'Freelance', tipo: 'renda' });
  for (const c of u.cartoes) {
    await FonteDestino.criar({ usuarioId: usuario.id, tipo: 'cartao_credito', ...c });
  }

  const categorias = await Categoria.listar(usuario.id);
  const fontes = await FonteDestino.listar(usuario.id);
  const cat = (nome, tipo) => categorias.find((c) => c.nome === nome && c.tipo === tipo).id;
  const fonte = (nome) => fontes.find((f) => f.nome === nome).id;
  const cartao1 = fonte(u.cartoes[0].nome);
  const cartao2 = fonte(u.cartoes[u.cartoes.length - 1].nome);

  const lancar = (tipo, descricao, valor, dataISO, categoria, fonteId, totalParcelas = 1) => {
    const dados = {
      usuarioId: usuario.id,
      tipo,
      descricao,
      valor: String(valor),
      data: dataISO,
      categoriaId: cat(categoria, tipo),
      fonteDestinoId: fonteId,
    };
    return totalParcelas > 1 ? Lancamento.criarParcelado({ ...dados, totalParcelas }) : Lancamento.criar(dados);
  };

  // k = -3, -2, -1 (meses completos) e 0 (mês atual, até o dia 15)
  for (let k = -3; k <= 0; k++) {
    await lancar('entrada', 'Salário', u.salario.toFixed(2), data(k, 5), 'Salário', fonte('Salário'));
    await lancar('saida', 'Aluguel', (u.salario * 0.25).toFixed(2), data(k, 8), 'Moradia', fonte('Conta corrente'));
    await lancar('saida', 'Conta de luz', variar(140, k, 12.35), data(k, 9), 'Moradia', fonte('Conta corrente'));
    await lancar('saida', 'Supermercado', variar(520, k, 41.7), data(k, 6), 'Alimentação', cartao1);
    await lancar('saida', 'Feira e padaria', variar(180, k, 15.4), data(k, 14), 'Alimentação', fonte('Conta corrente'));
    await lancar('saida', 'Combustível', variar(230, k, 22.1), data(k, 12), 'Mobilidade', cartao2);
    await lancar('saida', 'Transferência para poupança', '400.00', data(k, 10), 'Outros', fonte('Conta corrente'));

    if (k < 0) {
      await lancar('saida', 'Restaurante', variar(160, k, 28.9), data(k, 20), 'Lazer', cartao1);
      await lancar('saida', 'Aplicativo de transporte', variar(95, k, 9.8), data(k, 24), 'Mobilidade', cartao1);
      await lancar('saida', 'Farmácia', variar(75, k, 11.25), data(k, 18), 'Saúde', fonte('Conta corrente'));
      await lancar('entrada', 'Rendimento poupança', variar(18, k, 1.15), data(k, 28), 'Outros', fonte('Poupança'));
    }
  }

  // Entradas extras e compras parceladas (as parcelas futuras aparecem na previsão de faturas)
  await lancar('entrada', 'Projeto freelance', '1200.00', data(-2, 15), 'Outros', fonte('Freelance'));
  await lancar('saida', 'Curso de inglês', '900.00', data(-2, 11), 'Educação', cartao2, 6);
  await lancar('saida', 'Notebook', '3600.00', data(-1, 20), 'Outros', cartao1, 10);
  await lancar('saida', 'Consulta médica', '100.00', data(0, 3), 'Saúde', cartao2, 3);

  return usuario;
}

try {
  for (const u of USUARIOS) {
    const usuario = await criarUsuario(u);
    console.log(`Usuário criado: ${usuario.email} (senha: ${SENHA})`);
  }
  console.log('Seed concluído.');
} catch (erro) {
  console.error('Erro no seed:', erro.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
