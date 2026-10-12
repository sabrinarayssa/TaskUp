const Database = require('better-sqlite3');
const path = require('node:path');

const db = new Database(path.join(__dirname, '..', 'tarefas.db'));

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    nome      TEXT NOT NULL,
    telefone  TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (nome, telefone)
  );

  CREATE TABLE IF NOT EXISTS tarefas (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_nome     TEXT NOT NULL,
    usuario_telefone TEXT NOT NULL,
    titulo           TEXT NOT NULL,
    descricao        TEXT,
    status           TEXT NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente', 'concluida')),
    criado_em        TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (usuario_nome, usuario_telefone)
      REFERENCES usuarios (nome, telefone)
  );

  CREATE INDEX IF NOT EXISTS idx_tarefas_usuario
    ON tarefas (usuario_nome, usuario_telefone);
`);

module.exports = db;
