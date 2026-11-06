const db = require('../db');

// Estes são os campos que podem ir para o navegador. O senha_hash NUNCA
// deve sair do servidor, por isso não usamos SELECT * aqui.
const CAMPOS_PUBLICOS = 'nome, telefone, criado_em';

// Lista todos os usuários, do mais recente para o mais antigo.
function listar() {
  return db
    .prepare(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios ORDER BY criado_em DESC`)
    .all();
}

// Busca um usuário pela chave primária composta (nome + telefone).
// Retorna apenas dados públicos (sem a senha).
function buscar(nome, telefone) {
  return db
    .prepare(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE nome = ? AND telefone = ?`)
    .get(nome, telefone);
}

// Usado somente pelo login: aqui sim precisamos do senha_hash para conferir.
function buscarComSenha(nome, telefone) {
  return db
    .prepare('SELECT nome, telefone, senha_hash FROM usuarios WHERE nome = ? AND telefone = ?')
    .get(nome, telefone);
}

// Cria um usuário já com a senha criptografada.
function criar(nome, telefone, senhaHash) {
  return db
    .prepare('INSERT INTO usuarios (nome, telefone, senha_hash) VALUES (?, ?, ?)')
    .run(nome, telefone, senhaHash);
}

// Define a senha de um usuário criado antes desta funcionalidade existir.
function definirSenha(nome, telefone, senhaHash) {
  return db
    .prepare('UPDATE usuarios SET senha_hash = ? WHERE nome = ? AND telefone = ?')
    .run(senhaHash, nome, telefone);
}

module.exports = { listar, buscar, buscarComSenha, criar, definirSenha };
