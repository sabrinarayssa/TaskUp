const db = require('../db');

// Lista as subtarefas de uma tarefa, da mais antiga para a mais nova.
function listar(tarefaId) {
  return db
    .prepare(`
      SELECT id, tarefa_id, titulo, concluida, criado_em
      FROM subtarefas
      WHERE tarefa_id = ?
      ORDER BY id
    `)
    .all(tarefaId);
}

function buscar(id) {
  return db.prepare('SELECT * FROM subtarefas WHERE id = ?').get(id);
}

function criar({ tarefaId, titulo }) {
  const { lastInsertRowid } = db
    .prepare('INSERT INTO subtarefas (tarefa_id, titulo) VALUES (?, ?)')
    .run(tarefaId, titulo);
  return lastInsertRowid;
}

function atualizar(id, { titulo, concluida }) {
  db.prepare('UPDATE subtarefas SET titulo = ?, concluida = ? WHERE id = ?').run(
    titulo,
    concluida,
    id,
  );
}

function excluir(id) {
  return db.prepare('DELETE FROM subtarefas WHERE id = ?').run(id);
}

module.exports = { listar, buscar, criar, atualizar, excluir };
