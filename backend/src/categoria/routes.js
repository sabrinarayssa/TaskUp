const express = require('express');
const categoriaDB = require('./sql');
const usuarioDB = require('../usuarios/sql');

const router = express.Router();

// O nome da categoria vem no campo "categoria"; "nome" e "telefone"
// identificam o usuário, igual às rotas de tarefas.
function erroDeDuplicidade(erro) {
  return erro.code === 'ERR_SQLITE_ERROR' && /UNIQUE constraint failed/.test(erro.message);
}

// GET /categoria — pode filtrar pelo nome e telefone do usuário.
router.get('/', (req, res) => {
  const { nome, telefone } = req.query;
  if ((nome && !telefone) || (!nome && telefone)) {
    return res.status(400).json({ erro: 'Informe nome e telefone juntos.' });
  }
  res.json(categoriaDB.listar(nome, telefone));
});

// POST /categoria
router.post('/', (req, res) => {
  const { categoria, nome, telefone } = req.body;
  if (!categoria || !nome || !telefone) {
    return res.status(400).json({ erro: 'Categoria, nome e telefone são obrigatórios.' });
  }
  if (!usuarioDB.buscar(nome, telefone)) {
    return res.status(404).json({ erro: 'Usuário não encontrado.' });
  }

  try {
    const id = categoriaDB.criar({ nome, telefone, categoria });
    res.status(201).json(categoriaDB.buscar(id));
  } catch (erro) {
    if (erroDeDuplicidade(erro)) {
      return res.status(409).json({ erro: 'Esta categoria já existe para este usuário.' });
    }
    throw erro;
  }
});

// PUT /categoria/:id
router.put('/:id', (req, res) => {
  const atual = categoriaDB.buscar(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Categoria não encontrada.' });

  const categoria = req.body.categoria ?? atual.nome;
  if (!categoria) return res.status(400).json({ erro: 'O nome da categoria é obrigatório.' });

  try {
    categoriaDB.atualizar(atual.id, categoria);
  } catch (erro) {
    if (erroDeDuplicidade(erro)) {
      return res.status(409).json({ erro: 'Esta categoria já existe para este usuário.' });
    }
    throw erro;
  }

  res.json(categoriaDB.buscar(atual.id));
});

// DELETE /categoria/:id
router.delete('/:id', (req, res) => {
  const { changes } = categoriaDB.excluir(req.params.id);
  if (!changes) return res.status(404).json({ erro: 'Categoria não encontrada.' });
  res.status(204).end();
});

module.exports = router;
