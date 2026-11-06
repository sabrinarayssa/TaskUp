const express = require('express');
const usuarioDB = require('./sql');
const { criarHash, conferirSenha } = require('./senha');

const router = express.Router();
const SENHA_MINIMA = 6;

function erroDeDuplicidade(erro) {
  return erro.code === 'ERR_SQLITE_ERROR' && /UNIQUE constraint failed/.test(erro.message);
}

// GET /usuarios — lista apenas nome, telefone e data de criação.
router.get('/', (req, res) => {
  res.json(usuarioDB.listar());
});

// POST /usuarios — cria a conta com nome, telefone e senha.
router.post('/', (req, res) => {
  const { nome, telefone, senha } = req.body;

  if (!nome || !telefone || !senha) {
    return res.status(400).json({ erro: 'Nome, telefone e senha são obrigatórios.' });
  }
  if (String(senha).length < SENHA_MINIMA) {
    return res
      .status(400)
      .json({ erro: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` });
  }

  const existente = usuarioDB.buscarComSenha(nome, telefone);

  // Contas criadas antes da senha existir: no primeiro cadastro com os
  // mesmos nome e telefone, a pessoa define a senha dela.
  if (existente && existente.senha_hash) {
    return res
      .status(409)
      .json({ erro: 'Esta conta já existe. Use a opção "Entrar".' });
  }

  try {
    if (existente) {
      usuarioDB.definirSenha(nome, telefone, criarHash(senha));
    } else {
      usuarioDB.criar(nome, telefone, criarHash(senha));
    }
  } catch (erro) {
    if (erroDeDuplicidade(erro)) {
      return res.status(409).json({ erro: 'Esta conta já existe. Use a opção "Entrar".' });
    }
    throw erro;
  }

  res.status(201).json(usuarioDB.buscar(nome, telefone));
});

// POST /usuarios/login — confere nome, telefone e senha.
router.post('/login', (req, res) => {
  const { nome, telefone, senha } = req.body;

  if (!nome || !telefone || !senha) {
    return res.status(400).json({ erro: 'Nome, telefone e senha são obrigatórios.' });
  }

  const usuario = usuarioDB.buscarComSenha(nome, telefone);

  // Conta antiga, de quando o sistema ainda não pedia senha.
  if (usuario && !usuario.senha_hash) {
    return res.status(409).json({
      erro: 'Esta conta foi criada antes da senha. Use a opção "Criar conta" com os mesmos dados para definir uma senha.',
    });
  }

  // A mesma mensagem é usada para usuário inexistente e senha errada,
  // para não revelar quais contas existem.
  if (!usuario || !conferirSenha(senha, usuario.senha_hash)) {
    return res.status(401).json({ erro: 'Nome, telefone ou senha incorretos.' });
  }

  res.json({ nome: usuario.nome, telefone: usuario.telefone });
});

module.exports = router;
