const db = require('../db');

// Campos da tarefa + o nome da categoria (pode ser NULL).
const CAMPOS = `
  t.id,
  t.usuario_nome,
  t.usuario_telefone,
  t.categoria_id,
  c.nome AS categoria_nome,
  t.titulo,
  t.descricao,
  t.prazo,
  t.prioridade,
  t.status,
  t.excluida_em,
  t.criado_em,
  (SELECT COUNT(*) FROM subtarefas s WHERE s.tarefa_id = t.id) AS total_subtarefas,
  (SELECT COUNT(*) FROM subtarefas s
    WHERE s.tarefa_id = t.id AND s.concluida = 1) AS subtarefas_concluidas
`;

const ORIGEM = `
  FROM tarefas t
  LEFT JOIN categorias c ON c.id = t.categoria_id
`;

// Monta o trecho de filtro por usuário (nome + telefone) e os parâmetros.
function filtroUsuario(nome, telefone) {
  if (nome && telefone) {
    return {
      sql: 'AND t.usuario_nome = ? AND t.usuario_telefone = ?',
      parametros: [nome, telefone],
    };
  }
  return { sql: '', parametros: [] };
}

// Lista as tarefas que NÃO estão na lixeira.
function listar(nome, telefone) {
  const filtro = filtroUsuario(nome, telefone);
  return db
    .prepare(`
      SELECT ${CAMPOS} ${ORIGEM}
      WHERE t.excluida_em IS NULL ${filtro.sql}
      ORDER BY t.id DESC
    `)
    .all(...filtro.parametros);
}

// Lista somente as tarefas que estão na lixeira.
function listarLixeira(nome, telefone) {
  const filtro = filtroUsuario(nome, telefone);
  return db
    .prepare(`
      SELECT ${CAMPOS} ${ORIGEM}
      WHERE t.excluida_em IS NOT NULL ${filtro.sql}
      ORDER BY t.excluida_em DESC, t.id DESC
    `)
    .all(...filtro.parametros);
}

function buscar(id) {
  return db
    .prepare(`SELECT ${CAMPOS} ${ORIGEM} WHERE t.id = ?`)
    .get(id);
}

// Cria uma tarefa e retorna o id gerado.
function criar({ nome, telefone, titulo, descricao, prazo, prioridade, categoriaId }) {
  const { lastInsertRowid } = db
    .prepare(`
      INSERT INTO tarefas
        (usuario_nome, usuario_telefone, categoria_id, titulo, descricao, prazo, prioridade)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      nome,
      telefone,
      categoriaId ?? null,
      titulo,
      descricao ?? null,
      prazo ?? null,
      prioridade ?? 'media',
    );
  return lastInsertRowid;
}

function atualizar(id, { titulo, descricao, prazo, prioridade, status, categoriaId }) {
  db.prepare(`
    UPDATE tarefas
    SET titulo = ?, descricao = ?, prazo = ?, prioridade = ?, status = ?, categoria_id = ?
    WHERE id = ?
  `).run(titulo, descricao, prazo, prioridade, status, categoriaId ?? null, id);
}

// Excluir de verdade só acontece na lixeira. Aqui apenas marcamos a data.
function excluir(id) {
  return db
    .prepare(`
      UPDATE tarefas
      SET excluida_em = datetime('now')
      WHERE id = ? AND excluida_em IS NULL
    `)
    .run(id);
}

function restaurar(id) {
  return db
    .prepare(`
      UPDATE tarefas
      SET excluida_em = NULL
      WHERE id = ? AND excluida_em IS NOT NULL
    `)
    .run(id);
}

// Remove a tarefa do banco (usado apenas dentro da lixeira).
function excluirDefinitivo(id) {
  return db.prepare('DELETE FROM tarefas WHERE id = ?').run(id);
}

module.exports = {
  listar,
  listarLixeira,
  buscar,
  criar,
  atualizar,
  excluir,
  restaurar,
  excluirDefinitivo,
};
