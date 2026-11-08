# TaskUp

Gerenciador de tarefas escolares com API RESTful e interface web.

## Aplicação publicada

O TaskUp está publicado no **Render Cloud**:

**https://taskup-rffb.onrender.com/**

A mesma URL atende a interface web e a API. O frontend é servido pelo próprio backend, então não é necessário publicar dois serviços separados.

### Conta de demonstração

- **Nome:** `Aluno Demo`
- **Telefone:** `11999990000`
- **E-mail:** `aluno@demo.com`
- **Senha:** `demo1234`

O login é feito com **e-mail e senha**. Também é possível criar uma conta nova com nome, telefone, e-mail e senha. A senha é guardada criptografada (hash) no banco, nunca em texto puro.

## Sobre o projeto

O TaskUp foi desenvolvido para a unidade curricular **Sistemas Distribuídos e Mobile**. O sistema permite organizar tarefas pessoais e escolares, com categorias, prazos, prioridades, subtarefas e uma lixeira para exclusões reversíveis.

O projeto usa o modelo cliente/servidor: o frontend consome uma API RESTful, que valida os dados e acessa o banco SQLite.

## Funcionalidades

- Cadastro e login de usuário com nome, telefone, e-mail e senha.
- Recuperação de senha confirmando e-mail e telefone cadastrados.
- Criação, listagem, edição, conclusão e exclusão de tarefas.
- Categorias para organizar as tarefas.
- Prazo e prioridade nas tarefas.
- Subtarefas com checklist e progresso.
- Busca por título sem diferenciar maiúsculas ou acentos.
- Filtros por status e categoria, combináveis entre si.
- Lixeira com restauração e exclusão definitiva.
- Visualização dos detalhes e das subtarefas diretamente no cartão da tarefa.
- Navegação adaptada para celular, com barra inferior.

## Tecnologias

- **Node.js 24**
- **Express**
- **SQLite** por meio do módulo nativo `node:sqlite`
- **HTML, CSS e JavaScript** puro no frontend
- **Render Cloud** para a publicação

As únicas dependências do backend são `express` e `cors`. O SQLite é acessado pelo módulo nativo do Node.js, sem dependência nativa adicional.

### Sobre a senha

A senha é transformada em hash com `scrypt` (módulo nativo `node:crypto`) e um salt aleatório antes de ser gravada. O login é feito com **e-mail e senha** e nunca devolve o hash na API. Nesta versão, a sessão fica salva no navegador (`localStorage`) e a identificação das tarefas continua usando nome e telefone; proteger as rotas com um token de sessão é a próxima evolução natural do projeto.

Na recuperação de senha, a pessoa confirma o **e-mail e o telefone** cadastrados e define uma nova senha. O telefone é comparado apenas pelos dígitos, então `(11) 99999-0000` e `11999990000` são equivalentes. Esse fluxo não depende de envio de e-mail.

## Estrutura do projeto

```text
.
├── backend/
│   ├── src/
│   │   ├── categoria/       # Rotas e consultas de categorias
│   │   ├── subtarefas/      # Rotas e consultas de subtarefas
│   │   ├── tarefas/         # Rotas e consultas de tarefas
│   │   ├── usuarios/        # Rotas e consultas de usuários
│   │   ├── db.js            # Criação das tabelas e migrações
│   │   └── server.js        # Servidor Express e frontend estático
│   ├── package.json
│   └── tarefas-demo.db      # Banco de demonstração usado no Render
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── config.js
├── docs/
│   └── TaskUp - Artigo Tecnico (atualizado).pdf
└── render.yaml              # Configuração de deploy no Render
```

## Como rodar localmente

Pré-requisito: **Node.js 22.5 ou superior** (recomendado: Node.js 24).

```bash
cd backend
npm install
npm start
```

Depois, abra:

**http://localhost:3000/**

O backend também pode usar outro arquivo de banco por meio da variável `TASKUP_DB`:

```bash
TASKUP_DB=./tarefas-demo.db npm start
```

No Windows, use o formato correspondente ao terminal utilizado, por exemplo:

```powershell
$env:TASKUP_DB="tarefas-demo.db"; npm start
```

## Deploy no Render

O deploy é definido pelo arquivo [`render.yaml`](render.yaml):

- Tipo: **Web Service**
- Runtime: **Node**
- Pasta raiz: `backend`
- Build: `npm install`
- Start: `npm start`
- Plano: `free`
- `NODE_VERSION`: `24`
- `TASKUP_DB`: `tarefas-demo.db`

A URL publicada é:

**https://taskup-rffb.onrender.com/**

### Observação sobre o banco no Render

No plano gratuito do Render, o disco é temporário. O SQLite usado na publicação é o banco de demonstração `backend/tarefas-demo.db`; alterações feitas pela URL pública podem ser perdidas quando o serviço for reiniciado ou um novo deploy for feito.

O banco local `backend/tarefas.db` não é enviado ao repositório e não é usado pelo Render.

## Endpoints principais

| Método | Rota | Função |
|---|---|---|
| GET | `/usuarios` | Lista usuários (sem a senha) |
| POST | `/usuarios` | Cadastra usuário com nome, telefone, e-mail e senha |
| POST | `/usuarios/login` | Confere e-mail e senha |
| POST | `/usuarios/redefinir-senha-simples` | Confere e-mail + telefone e grava a nova senha |
| GET | `/categoria` | Lista categorias |
| POST | `/categoria` | Cadastra categoria |
| PUT | `/categoria/:id` | Edita categoria |
| DELETE | `/categoria/:id` | Exclui categoria |
| GET | `/tarefas` | Lista tarefas ativas |
| GET | `/tarefas/lixeira` | Lista tarefas da lixeira |
| GET | `/tarefas/:id` | Detalha uma tarefa |
| POST | `/tarefas` | Cadastra tarefa |
| PUT | `/tarefas/:id` | Edita tarefa ou status |
| PUT | `/tarefas/:id/restaurar` | Restaura tarefa da lixeira |
| DELETE | `/tarefas/:id` | Move a tarefa para a lixeira |
| DELETE | `/tarefas/:id/definitivo` | Exclui a tarefa definitivamente |
| GET | `/tarefas/:id/subtarefas` | Lista subtarefas |
| POST | `/tarefas/:id/subtarefas` | Cadastra subtarefa |
| PUT | `/tarefas/:id/subtarefas/:subtarefaId` | Edita ou conclui subtarefa |
| DELETE | `/tarefas/:id/subtarefas/:subtarefaId` | Exclui subtarefa |

## Testes

Os testes foram realizados manualmente com requisições HTTP e pelo navegador. Foram verificados cadastro de usuário, login por e-mail, recuperação de senha (e-mail/telefone corretos, telefone errado e senha curta), criação e edição de tarefas, categorias, subtarefas, busca, filtros, lixeira, restauração, exclusão definitiva e o fluxo completo da interface.

O artigo técnico com a descrição do projeto e a tabela de testes está em [`docs/TaskUp - Artigo Tecnico (atualizado).pdf`](docs/TaskUp%20-%20Artigo%20Tecnico%20(atualizado).pdf).
