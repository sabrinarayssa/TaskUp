# TaskUp

Gerenciador de tarefas escolares com API RESTful e interface web.

## Aplicação publicada

O TaskUp está publicado no **Render Cloud**:

**https://taskup-rffb.onrender.com/**

A mesma URL atende a interface web e a API. O frontend é servido pelo próprio backend, então não é necessário publicar dois serviços separados.

### Conta de demonstração

- **Nome:** `Aluno Demo`
- **Telefone:** `11999990000`

Também é possível entrar com outro nome e telefone; o cadastro é simples e não usa senha.

## Sobre o projeto

O TaskUp foi desenvolvido para a unidade curricular **Sistemas Distribuídos e Mobile**. O sistema permite organizar tarefas pessoais e escolares, com categorias, prazos, prioridades, subtarefas e uma lixeira para exclusões reversíveis.

O projeto usa o modelo cliente/servidor: o frontend consome uma API RESTful, que valida os dados e acessa o banco SQLite.

## Funcionalidades

- Cadastro e identificação de usuário por nome e telefone.
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
| GET | `/usuarios` | Lista usuários |
| POST | `/usuarios` | Cadastra usuário |
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

Os testes foram realizados manualmente com requisições HTTP e pelo navegador. Foram verificados cadastro de usuário, criação e edição de tarefas, categorias, subtarefas, busca, filtros, lixeira, restauração, exclusão definitiva e o fluxo completo da interface.

O artigo técnico com a descrição do projeto e a tabela de testes está em [`docs/TaskUp - Artigo Tecnico (atualizado).pdf`](docs/TaskUp%20-%20Artigo%20Tecnico%20(atualizado).pdf).
