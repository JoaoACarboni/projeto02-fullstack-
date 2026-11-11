# Projeto 02 Full Stack – Controle Financeiro Pessoal

Sistema web de controle financeiro pessoal, desenvolvido com arquitetura Full Stack, composto por uma API REST em Node.js e uma aplicação SPA em React. O projeto permite a autenticação de usuários e oferece a estrutura para gerenciamento de receitas, despesas e demais informações financeiras.

## Tecnologias utilizadas

### Back-End
- Node.js e Express
- PostgreSQL (driver `pg`, com pool de conexões)
- JWT (`jsonwebtoken`) para autenticação
- `bcrypt` para criptografia de senhas
- `dotenv` para gerenciamento de variáveis de ambiente
- `cors` para controle de acesso entre origens
- `express-rate-limit` para limitação de requisições

### Front-End
- React com Vite
- React Router para gerenciamento de rotas
- Axios para comunicação com a API

## Estrutura do projeto

```text
projeto02-fullstack/
│
├── backend/
│   ├── database/       Scripts SQL
│   ├── src/
│   │   ├── routes/     Rotas e controladores
│   │   ├── models/     Acesso ao banco de dados
│   │   ├── middlewares/
│   │   ├── config/     Conexão e utilitários
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/  AuthContext
│   │   └── services/  Cliente HTTP (api.js)
│   ├── .env.example
│   └── package.json
│
└── README.md
```

## Pré-requisitos

- Node.js 18 ou superior
- npm
- PostgreSQL instalado e configurado
- Git

## Como executar o projeto

### 1. Clonar o repositório

```bash
git clone https://github.com/JoaoACarboni/projeto02-fullstack-.git
cd projeto02-fullstack-
```

### 2. Configurar o Back-End

Acesse a pasta do back-end:

```bash
cd backend
```

Instale as dependências:

```bash
npm install
```

Copie o arquivo `.env.example` para `.env` e configure as variáveis de ambiente, incluindo `DATABASE_URL` e `JWT_SECRET`.

Crie o banco de dados:

```bash
psql -U postgres -c "CREATE DATABASE financas;"
```

Execute o script de criação das tabelas:

```bash
psql -U postgres -d financas -f database/schema.sql
```

Inicie a API:

```bash
npm run dev
```

Por padrão, a API estará disponível em:

`http://localhost:3000`

### 3. Configurar o Front-End

Abra outro terminal e acesse a pasta do front-end:

```bash
cd frontend
```

Instale as dependências:

```bash
npm install
```

Copie o arquivo `.env.example` para `.env` e configure o endereço da API. Por padrão:

```env
VITE_API_URL=http://localhost:3000/api
```

Inicie a aplicação:

```bash
npm run dev
```

Por padrão, o front-end estará disponível em:

`http://localhost:5173`

**Importante:** o back-end deve estar em execução antes de utilizar o front-end.

## Funcionalidades implementadas

### Autenticação e usuários
- Cadastro de usuários com validação no servidor.
- Validação de e-mail, CPF com dígitos verificadores e senha.
- Garantia de unicidade de e-mail e CPF por restrições `UNIQUE` no banco de dados.
- Login com autenticação JWT, com validade de uma hora.
- Proteção contra excesso de tentativas de requisição.
- Persistência da sessão após recarregamento da página.
- Logout automático quando o token expira ou a API retorna erro 401.
- Exibição de mensagens de erro retornadas pelo servidor.

### Aplicação e navegação
- Interface desenvolvida em React.
- Navegação com React Router.
- Rotas protegidas para usuários autenticados.
- Comunicação centralizada com a API por meio do Axios.

## Rotas da API implementadas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Testa a conexão com o banco de dados |
| POST | `/api/auth/cadastro` | Cadastra usuário e cria categorias e fontes padrão |
| POST | `/api/auth/login` | Autentica o usuário e retorna o JWT |
| GET | `/api/auth/me` | Retorna os dados do usuário autenticado (requer token) |

## Funcionalidades em desenvolvimento

- Dashboard financeiro.
- Gerenciamento de lançamentos.
- Gerenciamento de categorias.
- Gerenciamento de fontes e destinos.
- Relatórios financeiros.
- Gerenciamento de faturas.

## Autores

- **João Antonio Carboni Gomes**
- **Diogo Calegari dos Reis**