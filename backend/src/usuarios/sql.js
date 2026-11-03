const db = require('../db');

// Lista todos os usuários, do mais recente para o mais antigo.
function listar() {
  return db.prepare('SELECT * FROM usuarios ORDER BY criado_em DESC').all();
}

// Busca um usuário pela chave primária composta (nome + telefone).
function buscar(nome, telefone) {
  return db
    .prepare('SELECT * FROM usuarios WHERE nome = ? AND telefone = ?')
    .get(nome, telefone);
}

// Cria um usuário e retorna o resultado da operação (para detectar duplicidade).
function criar(nome, telefone) {
  return db.prepare('INSERT INTO usuarios (nome, telefone) VALUES (?, ?)').run(nome, telefone);
}

module.exports = { listar, buscar, criar };
