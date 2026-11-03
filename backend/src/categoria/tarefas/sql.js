const db = require('../db');

// Lista tarefas. Pode filtrar pelo nome e telefone do usuário.
function listar(nome, telefone) {
  if (nome && telefone) {
    return db
      .prepare(`
        SELECT * FROM tarefas
        WHERE usuario_nome = ? AND usuario_telefone = ?
        ORDER BY id DESC
      `)
      .all(nome, telefone);
  }
  return db.prepare('SELECT * FROM tarefas ORDER BY id DESC').all();
}

function buscar(id) {
  return db.prepare('SELECT * FROM tarefas WHERE id = ?').get(id);
}

// Cria uma tarefa e retorna o id gerado.
function criar({ nome, telefone, titulo, descricao }) {
  const { lastInsertRowid } = db
    .prepare(`
      INSERT INTO tarefas (usuario_nome, usuario_telefone, titulo, descricao)
      VALUES (?, ?, ?, ?)
    `)
    .run(nome, telefone, titulo, descricao ?? null);
  return lastInsertRowid;
}

function atualizar(id, { titulo, descricao, status }) {
  db.prepare('UPDATE tarefas SET titulo = ?, descricao = ?, status = ? WHERE id = ?').run(
    titulo,
    descricao,
    status,
    id,
  );
}

// Remove uma tarefa e retorna a quantidade de linhas afetadas.
function excluir(id) {
  return db.prepare('DELETE FROM tarefas WHERE id = ?').run(id);
}

module.exports = { listar, buscar, criar, atualizar, excluir };
