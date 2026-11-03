const express = require('express');
const tarefaDB = require('./sql');
const usuarioDB = require('../usuarios/sql');

const router = express.Router();

const STATUS = ['pendente', 'concluida'];

// GET /tarefas — pode filtrar pelo nome e telefone do usuário.
router.get('/', (req, res) => {
  const { nome, telefone } = req.query;
  if ((nome && !telefone) || (!nome && telefone)) {
    return res.status(400).json({ erro: 'Informe nome e telefone juntos.' });
  }
  res.json(tarefaDB.listar(nome, telefone));
});

// GET /tarefas/:id
router.get('/:id', (req, res) => {
  const tarefa = tarefaDB.buscar(req.params.id);
  if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
  res.json(tarefa);
});

// POST /tarefas
router.post('/', (req, res) => {
  const { titulo, descricao, nome, telefone } = req.body;
  if (!titulo || !nome || !telefone) {
    return res.status(400).json({ erro: 'Título, nome e telefone são obrigatórios.' });
  }
  if (!usuarioDB.buscar(nome, telefone)) {
    return res.status(404).json({ erro: 'Usuário não encontrado.' });
  }

  const id = tarefaDB.criar({ nome, telefone, titulo, descricao });
  res.status(201).json(tarefaDB.buscar(id));
});

// PUT /tarefas/:id
router.put('/:id', (req, res) => {
  const atual = tarefaDB.buscar(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Tarefa não encontrada.' });

  const titulo = req.body.titulo ?? atual.titulo;
  const descricao = req.body.descricao ?? atual.descricao;
  const status = req.body.status ?? atual.status;
  if (!titulo) return res.status(400).json({ erro: 'O título é obrigatório.' });
  if (!STATUS.includes(status)) {
    return res.status(400).json({ erro: `Status deve ser: ${STATUS.join(' ou ')}.` });
  }

  tarefaDB.atualizar(atual.id, { titulo, descricao, status });
  res.json(tarefaDB.buscar(atual.id));
});

// DELETE /tarefas/:id
router.delete('/:id', (req, res) => {
  const { changes } = tarefaDB.excluir(req.params.id);
  if (!changes) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
  res.status(204).end();
});

module.exports = router;
