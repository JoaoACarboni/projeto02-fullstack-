# Projeto 02 Full Stack – Controle Financeiro Pessoal

Aplicação de controle financeiro pessoal composta por uma **API REST** em Node.js/Express com PostgreSQL e uma **SPA** em React que a consome. O usuário se cadastra, faz login, registra entradas e saídas (com categorias, fontes/destinos e compras parceladas no cartão) e acompanha relatórios, a previsão das faturas dos cartões e uma página de saúde financeira.

## Tecnologias

**Back-end**
- Node.js + Express 5
- PostgreSQL com o driver `pg` (pool de conexões)
- `bcrypt` (hash + salt das senhas) e `jsonwebtoken` (JWT com validade de 1 hora)
- `dotenv`, `cors` (restrito à origem do front-end)

**Front-end**
- React 19 + Vite
- React Router
- Axios (cliente HTTP único em `src/services/api.js`)
- Gráficos feitos em SVG/CSS próprios (`components/Graficos.jsx`), sem biblioteca extra

## Estrutura do projeto

```text
projeto02-fullstack-/
├── backend/
│   ├── package.json
│   ├── .env.example          modelo das variáveis (PORT, DATABASE_URL, JWT_SECRET, FRONTEND_URL)
│   ├── database/
│   │   ├── schema.sql        criação das tabelas (UNIQUE, NOT NULL, CHECK e chaves estrangeiras)
│   │   ├── criar-tabelas.js  executa o schema.sql (npm run db:criar)
│   │   └── seed.js           carga inicial de demonstração (npm run seed)
│   └── src/
│       ├── server.js         cria o app Express, registra middlewares e rotas
│       ├── routes/           rotas + código dos controladores
│       ├── models/           acesso ao banco de dados e regras de negócio
│       ├── middlewares/      autenticação JWT, validação e tratamento de erros
│       └── config/           pool de conexões com o banco
├── frontend/
│   ├── package.json
│   ├── .env.example          VITE_API_URL
│   └── src/
│       ├── components/       páginas e componentes (JSX)
│       ├── contexts/         AuthContext (token, usuário, login, logout)
│       └── services/         api.js: único ponto de acesso à API
└── README.md
```

**Onde ficam as funções utilitárias** (decisão do grupo):
- `cpfValido`, `emailValido`, `senhaValida` e `dataIsoValida` ficam em `backend/src/middlewares/validacao.js`, junto dos middlewares de validação que as usam.
- `calcularFatura` (regra de fechamento do cartão) fica em `backend/src/models/fatura.js`, junto do model que monta as faturas.
- A divisão do valor em parcelas (`dividirEmParcelas`, em centavos) fica em `backend/src/models/lancamento.js`.
- No front-end, as funções de formatação (moeda, datas) ficam em `frontend/src/components/formatos.js`.

## Como rodar do zero

### Pré-requisitos
- Node.js 18 ou superior (com npm)
- PostgreSQL instalado e em execução

### 1. Clonar o repositório

```bash
git clone https://github.com/JoaoACarboni/projeto02-fullstack-.git
cd projeto02-fullstack-
```

### 2. Back-end

```bash
cd backend
npm install
```

Copie `.env.example` para `.env` e preencha os valores:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/financas
JWT_SECRET=um-segredo-longo-e-aleatorio
FRONTEND_URL=http://localhost:5173
```

Crie o banco, as tabelas e carregue os dados de demonstração:

```bash
psql -U postgres -c "CREATE DATABASE financas;"
npm run db:criar      # executa database/schema.sql (pode rodar mais de uma vez)
npm run seed          # cria os usuários de demonstração com 3 meses de lançamentos
```

> Alternativa sem o script: `psql -U postgres -d financas -f database/schema.sql`.

Suba a API (fica em `http://localhost:3000`):

```bash
npm run dev
```

### 3. Front-end

Em outro terminal:

```bash
cd frontend
npm install
```

Copie `.env.example` para `.env` (o padrão já aponta para a API local):

```env
VITE_API_URL=http://localhost:3000/api
```

Suba a aplicação (fica em `http://localhost:5173`):

```bash
npm run dev
```

### Usuários de demonstração (seed)

| Nome | E-mail | Senha | Cartões |
|---|---|---|---|
| Ana Souza | `ana@exemplo.com` | `senha1234` | Nubank (fecha dia 3, vence dia 10) e Visa crédito (fecha dia 25, vence dia 5) |
| Bruno Lima | `bruno@exemplo.com` | `senha1234` | Inter (fecha dia 15, vence dia 22) |

O seed cria lançamentos para os 3 meses anteriores e o mês atual (contados a partir da data em que é executado), incluindo compras parceladas (curso em 6x, notebook em 10x, consulta em 3x). Rodar `npm run seed` de novo recria apenas esses dois usuários.

## Rotas da API

Todas as rotas, exceto `/api/health`, `/api/auth/cadastro` e `/api/auth/login`, exigem o cabeçalho `Authorization: Bearer <token>`. Erros seguem o formato `{ "erro": "mensagem", "campos": { "campo": "mensagem" } }`.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Testa a conexão com o banco |
| POST | `/api/auth/cadastro` | Cadastra o usuário e cria as categorias e fontes/destinos padrão (`201`; `400` dados inválidos; `409` e-mail ou CPF já cadastrado) |
| POST | `/api/auth/login` | Autentica e devolve `{ token, usuario }` (`401` com mensagem genérica) |
| GET | `/api/auth/me` | Dados do usuário logado |
| GET | `/api/categorias` | Lista as categorias do usuário |
| POST | `/api/categorias` | Cria categoria `{ nome, tipo }` (`409` nome repetido para o mesmo tipo) |
| PUT | `/api/categorias/:id` | Renomeia a categoria `{ nome }` (o tipo não muda) |
| DELETE | `/api/categorias/:id` | Exclui (`409` se tiver lançamentos) |
| GET | `/api/fontes-destinos` | Lista as fontes/destinos |
| POST | `/api/fontes-destinos` | Cria `{ nome, tipo, diaFechamento?, diaVencimento?, limite? }` (os três últimos são obrigatórios para `cartao_credito`) |
| PUT | `/api/fontes-destinos/:id` | Edita (o tipo não muda) |
| DELETE | `/api/fontes-destinos/:id` | Exclui (`409` se tiver lançamentos) |
| GET | `/api/lancamentos` | Lista com filtros `inicio`, `fim`, `tipo`, `categoriaId`, `fonteDestinoId` e `pagina` (padrão: mês corrente). Devolve também os totais de entradas, saídas e saldo do período |
| GET | `/api/lancamentos/:id` | Busca um lançamento |
| POST | `/api/lancamentos` | Cria `{ tipo, descricao, valor, data, categoriaId, fonteDestinoId, totalParcelas? }`. Com `totalParcelas` > 1 (só saídas no cartão), gera uma linha por parcela em uma transação |
| PUT | `/api/lancamentos/:id` | Edita um lançamento (uma parcela), com as mesmas validações |
| DELETE | `/api/lancamentos/:id` | Exclui só este lançamento; com `?todas=true`, exclui todas as parcelas da compra |
| GET | `/api/relatorios/categorias?inicio=&fim=` | RF7: saídas e entradas por categoria, com percentual e comparação com o período anterior de mesmo tamanho |
| GET | `/api/relatorios/fontes-destinos?inicio=&fim=` | RF8: entradas por fonte, saídas por destino e saldo das contas |
| GET | `/api/relatorios/faturas?meses=3` | RF9: fatura aberta + as próximas `meses` (1 a 12) de cada cartão, com limite utilizado e disponível |
| GET | `/api/saude-financeira` | Desafio: indicadores, nota, projeção dos próximos meses e dicas |

## Regras de negócio e decisões

- **Unicidade de e-mail e CPF** garantida por `UNIQUE` no banco. Antes de gravar, o e-mail é normalizado com `trim().toLowerCase()` e o CPF fica só com os dígitos. A rota de cadastro não faz consulta prévia: ela trata o erro `23505` do PostgreSQL e devolve `409` indicando o campo.
- **Isolamento entre usuários:** o id do usuário vem sempre do token (`req.usuarioId`); toda consulta filtra por `usuario_id`. Acessar o registro de outro usuário devolve `404`. Categoria e fonte/destino de um lançamento precisam ser do mesmo usuário, e a categoria precisa ter o mesmo tipo do lançamento.
- **Dinheiro:** `NUMERIC(12,2)` no banco. O valor é validado como texto (até 2 casas) e as parcelas são divididas em **centavos inteiros**; a sobra do arredondamento vai para a 1ª parcela (R$ 100,00 em 3x = 33,34 + 33,33 + 33,33).
- **Parcelamento e faturas:** todas as parcelas guardam a **data da compra**, e a fatura de cada uma é calculada com `calcularFatura(data, cartao, parcela_atual)`. Escolhemos essa opção porque, se o dia de fechamento do cartão for alterado, as faturas são recalculadas automaticamente, sem precisar atualizar as parcelas já gravadas.
- **Regra de fechamento:** compra antes do dia de fechamento entra na fatura que fecha no mesmo mês; no dia do fechamento ou depois, na do mês seguinte. A parcela *k* cai *k − 1* meses depois. Dias inexistentes (ex.: 31 em fevereiro) viram o último dia do mês.
- **Limite utilizado** = soma de todas as parcelas cuja fatura ainda não venceu (inclui as parcelas futuras).
- **Relatórios** são agregados no banco (`GROUP BY` / `SUM`), nunca somando a lista no front-end. O "período anterior" tem o mesmo número de dias e termina na véspera do início.
- **Integridade:** chaves estrangeiras, `UNIQUE`, `NOT NULL` e `CHECK` no banco. Categorias e fontes/destinos com lançamentos não podem ser excluídas (`409`). O cadastro (usuário + padrões) e o parcelamento rodam em transações.
- **Sessão no front-end:** o token fica no `localStorage`. O `AuthContext` lê a expiração do JWT e encerra a sessão quando ele vence; se a API responder `401`, o interceptor do Axios limpa a sessão e volta ao login sem mostrar erro na tela.

### Saúde financeira (desafio)

Calculada no back-end (`models/saudeFinanceira.js`) com os 3 últimos meses completos:
- renda média, gasto médio, sobra média e taxa de poupança;
- meses fechados no azul e uso do limite dos cartões;
- nota de 0 a 100 (poupança 40 pts + uso do cartão 30 pts + constância 30 pts);
- maiores gastos por categoria, projeção da sobra acumulada para os próximos 3 meses e o que já está comprometido em parcelas nos cartões;
- dicas geradas a partir desses números (ex.: categoria que concentra os gastos, gasto acima da média no último mês, uso alto do limite, reserva de emergência ideal).

## Autores

- **João Antonio Carboni Gomes**
- **Diogo Calegari dos Reis**
