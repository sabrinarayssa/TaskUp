const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const db = new DatabaseSync(path.join(__dirname, '..', 'tarefas.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS tarefas (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo    TEXT NOT NULL,
    descricao TEXT,
    status    TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida')),
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

module.exports = db;
