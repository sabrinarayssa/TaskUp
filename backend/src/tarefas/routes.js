const express = require('express');
const tarefaDB = require('./sql');
const usuarioDB = require('../usuarios/sql');
const categoriaDB = require('../categoria/sql');
const subtarefasRouter = require('../subtarefas/routes');

const router = express.Router();

const STATUS = ['pendente', 'concluida'];
const PRIORIDADES = ['baixa', 'media', 'alta'];
const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

function prazoValido(prazo) {
  return prazo === null || FORMATO_DATA.test(prazo);
}

// A categoria é opcional, mas quando informada precisa pertencer ao mesmo usuário.
function validarCategoria(categoriaId, nome, telefone) {
  if (categoriaId === null || categoriaId === undefined || categoriaId === '') {
    return { categoriaId: null };
  }

  const id = Number(categoriaId);
  if (!Number.isInteger(id) || id <= 0) {
    return { erro: 'Categoria inválida.' };
  }

  const categoria = categoriaDB.buscar(id);
  if (!categoria || categoria.usuario_nome !== nome || categoria.usuario_telefone !== telefone) {
    return { erro: 'Categoria não encontrada para este usuário.' };
  }

  return { categoriaId: id };
}

// GET /tarefas — lista as tarefas que não estão na lixeira.
// Pode filtrar pelo nome e telefone do usuário.
router.get('/', (req, res) => {
  const { nome, telefone } = req.query;
  if ((nome && !telefone) || (!nome && telefone)) {
    return res.status(400).json({ erro: 'Informe nome e telefone juntos.' });
  }
  res.json(tarefaDB.listar(nome, telefone));
});

// GET /tarefas/lixeira — precisa vir antes de /:id.
router.get('/lixeira', (req, res) => {
  const { nome, telefone } = req.query;
  if ((nome && !telefone) || (!nome && telefone)) {
    return res.status(400).json({ erro: 'Informe nome e telefone juntos.' });
  }
  res.json(tarefaDB.listarLixeira(nome, telefone));
});

// Rotas de subtarefas: /tarefas/:tarefaId/subtarefas
router.use('/:tarefaId/subtarefas', subtarefasRouter);

// GET /tarefas/:id
router.get('/:id', (req, res) => {
  const tarefa = tarefaDB.buscar(req.params.id);
  if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
  res.json(tarefa);
});

// POST /tarefas
router.post('/', (req, res) => {
  const {
    titulo,
    descricao,
    nome,
    telefone,
    prazo = null,
    prioridade = 'media',
    categoria_id = null,
  } = req.body;

  if (!titulo || !nome || !telefone) {
    return res.status(400).json({ erro: 'Título, nome e telefone são obrigatórios.' });
  }
  if (!PRIORIDADES.includes(prioridade)) {
    return res.status(400).json({ erro: `Prioridade deve ser: ${PRIORIDADES.join(', ')}.` });
  }
  if (!prazoValido(prazo)) {
    return res.status(400).json({ erro: 'Prazo deve estar no formato AAAA-MM-DD.' });
  }
  if (!usuarioDB.buscar(nome, telefone)) {
    return res.status(404).json({ erro: 'Usuário não encontrado.' });
  }

  const categoria = validarCategoria(categoria_id, nome, telefone);
  if (categoria.erro) return res.status(400).json({ erro: categoria.erro });

  const id = tarefaDB.criar({
    nome,
    telefone,
    titulo,
    descricao,
    prazo,
    prioridade,
    categoriaId: categoria.categoriaId,
  });
  res.status(201).json(tarefaDB.buscar(id));
});

// PUT /tarefas/:id — edita título, descrição, prazo, prioridade e status.
router.put('/:id', (req, res) => {
  const atual = tarefaDB.buscar(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Tarefa não encontrada.' });

  const titulo = req.body.titulo ?? atual.titulo;
  const descricao =
    req.body.descricao === undefined ? atual.descricao : req.body.descricao || null;
  const prazo = req.body.prazo === undefined ? atual.prazo : req.body.prazo || null;
  const prioridade = req.body.prioridade ?? atual.prioridade;
  const status = req.body.status ?? atual.status;
  const categoria = validarCategoria(
    req.body.categoria_id === undefined ? atual.categoria_id : req.body.categoria_id,
    atual.usuario_nome,
    atual.usuario_telefone,
  );

  if (!titulo) return res.status(400).json({ erro: 'O título é obrigatório.' });
  if (!STATUS.includes(status)) {
    return res.status(400).json({ erro: `Status deve ser: ${STATUS.join(' ou ')}.` });
  }
  if (!PRIORIDADES.includes(prioridade)) {
    return res.status(400).json({ erro: `Prioridade deve ser: ${PRIORIDADES.join(', ')}.` });
  }
  if (!prazoValido(prazo)) {
    return res.status(400).json({ erro: 'Prazo deve estar no formato AAAA-MM-DD.' });
  }
  if (categoria.erro) return res.status(400).json({ erro: categoria.erro });

  tarefaDB.atualizar(atual.id, {
    titulo,
    descricao,
    prazo,
    prioridade,
    status,
    categoriaId: categoria.categoriaId,
  });
  res.json(tarefaDB.buscar(atual.id));
});

// PUT /tarefas/:id/restaurar — tira a tarefa da lixeira.
router.put('/:id/restaurar', (req, res) => {
  const tarefa = tarefaDB.buscar(req.params.id);
  if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
  if (!tarefa.excluida_em) {
    return res.status(400).json({ erro: 'Esta tarefa não está na lixeira.' });
  }

  tarefaDB.restaurar(tarefa.id);
  res.json(tarefaDB.buscar(tarefa.id));
});

// DELETE /tarefas/:id — manda a tarefa para a lixeira (soft delete).
router.delete('/:id', (req, res) => {
  const tarefa = tarefaDB.buscar(req.params.id);
  if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });

  if (!tarefa.excluida_em) tarefaDB.excluir(tarefa.id);
  res.status(204).end();
});

// DELETE /tarefas/:id/definitivo — apaga do banco. Só funciona na lixeira.
router.delete('/:id/definitivo', (req, res) => {
  const tarefa = tarefaDB.buscar(req.params.id);
  if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
  if (!tarefa.excluida_em) {
    return res.status(400).json({ erro: 'Mova a tarefa para a lixeira antes de excluir de vez.' });
  }

  tarefaDB.excluirDefinitivo(tarefa.id);
  res.status(204).end();
});

module.exports = router;
