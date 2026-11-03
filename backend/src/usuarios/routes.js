const express = require('express');
const usuarioDB = require('./sql');

const router = express.Router();

// GET /usuarios
router.get('/', (req, res) => {
  res.json(usuarioDB.listar());
});

// POST /usuarios
// Nome e telefone formam a chave primária composta do usuário.
router.post('/', (req, res) => {
  const { nome, telefone } = req.body;
  if (!nome || !telefone) {
    return res.status(400).json({ erro: 'Nome e telefone são obrigatórios.' });
  }

  try {
    usuarioDB.criar(nome, telefone);
  } catch (erro) {
    if (erro.code === 'ERR_SQLITE_ERROR' && /UNIQUE constraint failed/.test(erro.message)) {
      return res.status(409).json({ erro: 'Este nome e telefone já estão cadastrados.' });
    }
    throw erro;
  }

  res.status(201).json(usuarioDB.buscar(nome, telefone));
});

module.exports = router;
