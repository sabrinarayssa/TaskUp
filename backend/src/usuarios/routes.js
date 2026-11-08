const express = require('express');
const usuarioDB = require('./sql');
const { criarHash, conferirSenha } = require('./senha');

const router = express.Router();
const SENHA_MINIMA = 6;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// E-mail é comparado sem espaços e sem diferenciar maiúsculas de minúsculas.
function normalizarEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

function erroDeDuplicidade(erro) {
  return erro.code === 'ERR_SQLITE_ERROR' && /UNIQUE constraint failed/.test(erro.message);
}

function validarCadastro({ nome, telefone, email, senha }) {
  if (!nome || !telefone || !email || !senha) {
    return 'Nome, telefone, e-mail e senha são obrigatórios.';
  }
  if (!EMAIL_VALIDO.test(email)) {
    return 'Informe um e-mail válido.';
  }
  if (String(senha).length < SENHA_MINIMA) {
    return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  }
  return null;
}

// GET /usuarios — lista apenas nome, telefone, e-mail e data de criação.
router.get('/', (req, res) => {
  res.json(usuarioDB.listar());
});

// POST /usuarios — cria a conta com nome, telefone, e-mail e senha.
router.post('/', (req, res) => {
  const { nome, telefone, senha } = req.body;
  const email = normalizarEmail(req.body.email);

  const erroValidacao = validarCadastro({ nome, telefone, email, senha });
  if (erroValidacao) {
    return res.status(400).json({ erro: erroValidacao });
  }

  // O e-mail é a identidade de login, então não pode pertencer a outra conta.
  if (usuarioDB.buscarPorEmailComSenha(email)) {
    return res
      .status(409)
      .json({ erro: 'Este e-mail já está cadastrado. Use a opção "Entrar".' });
  }

  const existente = usuarioDB.buscarComSenha(nome, telefone);

  try {
    if (existente && existente.senha_hash) {
      // Conta antiga sem e-mail: para anexar o e-mail é preciso provar que
      // conhece a senha atual. Assim ninguém toma a conta de outra pessoa.
      if (existente.email) {
        return res
          .status(409)
          .json({ erro: 'Esta conta já existe. Use a opção "Entrar".' });
      }
      if (!conferirSenha(senha, existente.senha_hash)) {
        return res
          .status(401)
          .json({ erro: 'Esta conta já existe e a senha informada não confere.' });
      }
      usuarioDB.definirEmail(nome, telefone, email);
    } else if (existente) {
      // Conta criada antes da senha existir: no primeiro cadastro com os
      // mesmos nome e telefone, a pessoa define a senha e o e-mail.
      usuarioDB.definirSenha(nome, telefone, criarHash(senha));
      usuarioDB.definirEmail(nome, telefone, email);
    } else {
      usuarioDB.criar(nome, telefone, email, criarHash(senha));
    }
  } catch (erro) {
    if (erroDeDuplicidade(erro)) {
      return res.status(409).json({ erro: 'Esta conta ou e-mail já está cadastrado.' });
    }
    throw erro;
  }

  res.status(201).json(usuarioDB.buscar(nome, telefone));
});

// POST /usuarios/login — confere e-mail e senha.
router.post('/login', (req, res) => {
  const email = normalizarEmail(req.body.email);
  const { senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  const usuario = usuarioDB.buscarPorEmailComSenha(email);

  // A mesma mensagem é usada para e-mail inexistente e senha errada,
  // para não revelar quais contas existem.
  if (!usuario || !conferirSenha(senha, usuario.senha_hash)) {
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  }

  res.json({ nome: usuario.nome, telefone: usuario.telefone, email: usuario.email });
});

module.exports = router;
