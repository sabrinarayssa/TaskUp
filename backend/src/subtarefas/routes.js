const express = require('express');
const subtarefaDB = require('./sql');
const tarefaDB = require('../tarefas/sql');

// mergeParams permite acessar :tarefaId, que vem da rota montada em tarefas/routes.js.
const router = express.Router({ mergeParams: true });

function tarefaDaRota(req, res) {
  const tarefa = tarefaDB.buscar(req.params.tarefaId);
  if (!tarefa) {
    res.status(404).json({ erro: 'Tarefa não encontrada.' });
    return null;
  }
  return tarefa;
}

function normalizarConcluida(valor) {
  if (valor === true || valor === 1 || valor === '1') return 1;
  if (valor === false || valor === 0 || valor === '0') return 0;
  return null;
}

// GET /tarefas/:tarefaId/subtarefas
router.get('/', (req, res) => {
  const tarefa = tarefaDaRota(req, res);
  if (!tarefa) return;

  res.json(subtarefaDB.listar(tarefa.id));
});

// POST /tarefas/:tarefaId/subtarefas
router.post('/', (req, res) => {
  const tarefa = tarefaDaRota(req, res);
  if (!tarefa) return;
  if (tarefa.excluida_em) {
    return res.status(400).json({ erro: 'Restaure a tarefa antes de alterar as subtarefas.' });
  }

  const corpo = req.body || {};
  const titulo = typeof corpo.titulo === 'string' ? corpo.titulo.trim() : '';
  if (!titulo) {
    return res.status(400).json({ erro: 'O título da subtarefa é obrigatório.' });
  }

  const id = subtarefaDB.criar({ tarefaId: tarefa.id, titulo });
  res.status(201).json(subtarefaDB.buscar(id));
});

// PUT /tarefas/:tarefaId/subtarefas/:id
router.put('/:id', (req, res) => {
  const tarefa = tarefaDaRota(req, res);
  if (!tarefa) return;
  if (tarefa.excluida_em) {
    return res.status(400).json({ erro: 'Restaure a tarefa antes de alterar as subtarefas.' });
  }

  const atual = subtarefaDB.buscar(req.params.id);
  if (!atual || atual.tarefa_id !== tarefa.id) {
    return res.status(404).json({ erro: 'Subtarefa não encontrada.' });
  }

  const corpo = req.body || {};
  if (corpo.titulo !== undefined && typeof corpo.titulo !== 'string') {
    return res.status(400).json({ erro: 'O título da subtarefa deve ser um texto.' });
  }

  const titulo = corpo.titulo === undefined ? atual.titulo : corpo.titulo.trim();
  if (!titulo) {
    return res.status(400).json({ erro: 'O título da subtarefa é obrigatório.' });
  }

  const concluida =
    corpo.concluida === undefined
      ? atual.concluida
      : normalizarConcluida(corpo.concluida);
  if (concluida === null) {
    return res.status(400).json({ erro: 'Concluída deve ser verdadeiro ou falso.' });
  }

  subtarefaDB.atualizar(atual.id, { titulo, concluida });
  res.json(subtarefaDB.buscar(atual.id));
});

// DELETE /tarefas/:tarefaId/subtarefas/:id
router.delete('/:id', (req, res) => {
  const tarefa = tarefaDaRota(req, res);
  if (!tarefa) return;
  if (tarefa.excluida_em) {
    return res.status(400).json({ erro: 'Restaure a tarefa antes de alterar as subtarefas.' });
  }

  const atual = subtarefaDB.buscar(req.params.id);
  if (!atual || atual.tarefa_id !== tarefa.id) {
    return res.status(404).json({ erro: 'Subtarefa não encontrada.' });
  }

  subtarefaDB.excluir(atual.id);
  res.status(204).end();
});

module.exports = router;
