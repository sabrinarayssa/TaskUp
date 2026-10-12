const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const STATUS = ['pendente', 'concluida'];

// Listar tarefas
app.get('/tarefas', (req, res) => {
  res.json(db.prepare('SELECT * FROM tarefas ORDER BY id DESC').all());
});

// Detalhar uma tarefa
app.get('/tarefas/:id', (req, res) => {
  const tarefa = db.prepare('SELECT * FROM tarefas WHERE id = ?').get(req.params.id);
  if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
  res.json(tarefa);
});

// Cadastrar tarefa
app.post('/tarefas', (req, res) => {
  const { titulo, descricao } = req.body;
  if (!titulo) return res.status(400).json({ erro: 'O título é obrigatório.' });
  const { lastInsertRowid } = db
    .prepare('INSERT INTO tarefas (titulo, descricao) VALUES (?, ?)')
    .run(titulo, descricao ?? null);
  res.status(201).json(db.prepare('SELECT * FROM tarefas WHERE id = ?').get(lastInsertRowid));
});

// Editar tarefa (inclui marcar como concluída: { "status": "concluida" })
app.put('/tarefas/:id', (req, res) => {
  const atual = db.prepare('SELECT * FROM tarefas WHERE id = ?').get(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Tarefa não encontrada.' });

  const titulo = req.body.titulo ?? atual.titulo;
  const descricao = req.body.descricao ?? atual.descricao;
  const status = req.body.status ?? atual.status;
  if (!titulo) return res.status(400).json({ erro: 'O título é obrigatório.' });
  if (!STATUS.includes(status)) {
    return res.status(400).json({ erro: `Status deve ser: ${STATUS.join(' ou ')}.` });
  }

  db.prepare('UPDATE tarefas SET titulo = ?, descricao = ?, status = ? WHERE id = ?')
    .run(titulo, descricao, status, atual.id);
  res.json(db.prepare('SELECT * FROM tarefas WHERE id = ?').get(atual.id));
});

// Excluir tarefa
app.delete('/tarefas/:id', (req, res) => {
  const { changes } = db.prepare('DELETE FROM tarefas WHERE id = ?').run(req.params.id);
  if (!changes) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
  res.status(204).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TaskUp API em http://localhost:${PORT}`));
