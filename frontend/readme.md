# Projeto 02 Full Stack: Front-End

SPA em React do controle financeiro pessoal. Consome a API de [projeto02-fullstack-back-end](https://github.com/JoaoACarboni/projeto02-fullstack-back-end).

## Tecnologias utilizadas
- React com Vite
- React Router
- Axios

## Como rodar do zero
1. Suba antes a API do back-end (veja o README dele).
2. Instale as dependências:
   ```
   npm install
   ```
3. Copie `.env.example` para `.env` (por padrão a API é `http://localhost:3000/api`).
4. Rode:
   ```
   npm run dev
   ```
   A aplicação abre em `http://localhost:5173`.

## Estrutura
```
src/
  components/  telas e componentes
  contexts/    AuthContext (usuário, token, login, logout, cadastro)
  services/    cliente HTTP único (api.js)
```

## Funcionalidades
- Cadastro e login, com erros do servidor exibidos junto aos campos
- Rotas protegidas e sessão que sobrevive ao recarregamento da página
- Logout automático quando o token expira (401)
- Menu e telas em desenvolvimento: dashboard, lançamentos, categorias, fontes/destinos, relatórios e faturas

## Autores
João Antonio Carboni Gomes
Diogo Calegari dos Reis