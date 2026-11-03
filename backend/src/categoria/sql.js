const db = require('../db');

// Lista as categorias de um usuário (ou todas, se nome/telefone não vierem).
// O total de tarefas ajuda a interface a mostrar quantas usam cada categoria.
function listar(nome, telefone) {
  const filtro = nome && telefone
    ? 'WHERE c.usuario_nome = ? AND c.usuario_telefone = ?'
    : '';
  const parametros = nome && telefone ? [nome, telefone] : [];

  return db
    .prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM tarefas t WHERE t.categoria_id = c.id) AS total_tarefas
      FROM categorias c
      ${filtro}
      ORDER BY c.nome
    `)
    .all(...parametros);
}

function buscar(id) {
  return db.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
}

function criar({ nome, telefone, categoria }) {
  const { lastInsertRowid } = db
    .prepare(`
      INSERT INTO categorias (usuario_nome, usuario_telefone, nome)
      VALUES (?, ?, ?)
    `)
    .run(nome, telefone, categoria);
  return lastInsertRowid;
}

function atualizar(id, categoria) {
  db.prepare('UPDATE categorias SET nome = ? WHERE id = ?').run(categoria, id);
}

// As tarefas dessa categoria passam a ficar sem categoria (ON DELETE SET NULL).
function excluir(id) {
  return db.prepare('DELETE FROM categorias WHERE id = ?').run(id);
}

module.exports = { listar, buscar, criar, atualizar, excluir };
