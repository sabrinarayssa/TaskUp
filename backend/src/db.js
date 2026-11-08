const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

// node:sqlite já vem no Node.js (a partir da versão 22.5), então não precisamos
// de nenhuma dependência nativa para acessar o banco.
// TASKUP_DB permite usar outro arquivo, por exemplo em uma demonstração pública.
const caminhoBanco = process.env.TASKUP_DB
  ? path.resolve(process.env.TASKUP_DB)
  : path.join(__dirname, '..', 'tarefas.db');

const db = new DatabaseSync(caminhoBanco);

db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    nome       TEXT NOT NULL,
    telefone   TEXT NOT NULL,
    email      TEXT,
    senha_hash TEXT,
    criado_em  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (nome, telefone)
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_nome     TEXT NOT NULL,
    usuario_telefone TEXT NOT NULL,
    nome             TEXT NOT NULL,
    criado_em        TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (usuario_nome, usuario_telefone)
      REFERENCES usuarios (nome, telefone),
    UNIQUE (usuario_nome, usuario_telefone, nome)
  );

  CREATE TABLE IF NOT EXISTS tarefas (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_nome     TEXT NOT NULL,
    usuario_telefone TEXT NOT NULL,
    categoria_id     INTEGER,
    titulo           TEXT NOT NULL,
    descricao        TEXT,
    prazo            TEXT,
    prioridade       TEXT NOT NULL DEFAULT 'media'
                     CHECK (prioridade IN ('baixa', 'media', 'alta')),
    status           TEXT NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente', 'concluida')),
    excluida_em      TEXT,
    criado_em        TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (usuario_nome, usuario_telefone)
      REFERENCES usuarios (nome, telefone),
    FOREIGN KEY (categoria_id)
      REFERENCES categorias (id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tarefas_usuario
    ON tarefas (usuario_nome, usuario_telefone);

  CREATE TABLE IF NOT EXISTS subtarefas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    tarefa_id  INTEGER NOT NULL,
    titulo     TEXT NOT NULL,
    concluida  INTEGER NOT NULL DEFAULT 0
               CHECK (concluida IN (0, 1)),
    criado_em  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tarefa_id)
      REFERENCES tarefas (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_subtarefas_tarefa
    ON subtarefas (tarefa_id);
`);

// Migração de usuários: bancos criados antes da senha não têm a coluna
// senha_hash. O ALTER TABLE adiciona a coluna sem apagar os usuários.
const colunasUsuarios = db
  .prepare('PRAGMA table_info(usuarios)')
  .all()
  .map((coluna) => coluna.name);

if (!colunasUsuarios.includes('senha_hash')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN senha_hash TEXT');
}

// Migração de usuários: bancos criados antes do e-mail não têm a coluna
// email. O ALTER TABLE adiciona sem apagar os usuários existentes.
if (!colunasUsuarios.includes('email')) {
  db.exec('ALTER TABLE usuarios ADD COLUMN email TEXT');
}

// O e-mail precisa ser único. No SQLite, um índice UNIQUE permite vários
// NULL, então os usuários antigos (sem e-mail) continuam válidos.
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email)');

// Migração simples: bancos criados antes desta etapa não têm as colunas
// prazo, prioridade e excluida_em. O ALTER TABLE adiciona sem apagar dados.
const colunasTarefas = db
  .prepare('PRAGMA table_info(tarefas)')
  .all()
  .map((coluna) => coluna.name);

function adicionarColuna(nome, definicao) {
  if (!colunasTarefas.includes(nome)) {
    db.exec(`ALTER TABLE tarefas ADD COLUMN ${nome} ${definicao}`);
  }
}

adicionarColuna('prazo', 'TEXT');
adicionarColuna(
  'prioridade',
  "TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta'))",
);
adicionarColuna('excluida_em', 'TEXT');
adicionarColuna(
  'categoria_id',
  'INTEGER REFERENCES categorias (id) ON DELETE SET NULL',
);

module.exports = db;
