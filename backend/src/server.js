const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const STATUS = ['pendente', 'concluida'];

function buscarUsuario(nome, telefone) {
  return db.prepare('SELECT * FROM usuarios WHERE nome = ? AND telefone = ?')
    .get(nome, telefone);
}

app.get('/usuarios', (req, res) => {
  res.json(db.prepare('SELECT * FROM usuarios ORDER BY criado_em DESC').all());
});

// Nome e telefone formam a chave primária composta do usuário.
app.post('/usuarios', (req, res) => {
  const { nome, telefone } = req.body;
  if (!nome || !telefone) {
    return res.status(400).json({ erro: 'Nome e telefone são obrigatórios.' });
  }

  try {
    db.prepare('INSERT INTO usuarios (nome, telefone) VALUES (?, ?)').run(nome, telefone);
  } catch (erro) {
    if (erro.code?.includes('CONSTRAINT')) {
      return res.status(409).json({ erro: 'Este nome e telefone já estão cadastrados.' });
    }
    throw erro;
  }

  res.status(201).json(buscarUsuario(nome, telefone));
});

// Pode filtrar tarefas pelo nome e telefone do usuário.
app.get('/tarefas', (req, res) => {
  const { nome, telefone } = req.query;
  if ((nome && !telefone) || (!nome && telefone)) {
    return res.status(400).json({ erro: 'Informe nome e telefone juntos.' });
  }
  if (nome && telefone) {
    return res.json(db.prepare(`
      SELECT * FROM tarefas
      WHERE usuario_nome = ? AND usuario_telefone = ?
      ORDER BY id DESC
    `).all(nome, telefone));
  }
  res.json(db.prepare('SELECT * FROM tarefas ORDER BY id DESC').all());
});

app.get('/tarefas/:id', (req, res) => {
  const tarefa = db.prepare('SELECT * FROM tarefas WHERE id = ?').get(req.params.id);
  if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
  res.json(tarefa);
});

app.post('/tarefas', (req, res) => {
  const { titulo, descricao, nome, telefone } = req.body;
  if (!titulo || !nome || !telefone) {
    return res.status(400).json({ erro: 'Título, nome e telefone são obrigatórios.' });
  }
  if (!buscarUsuario(nome, telefone)) {
    return res.status(404).json({ erro: 'Usuário não encontrado.' });
  }

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO tarefas (usuario_nome, usuario_telefone, titulo, descricao)
    VALUES (?, ?, ?, ?)
  `).run(nome, telefone, titulo, descricao ?? null);
  res.status(201).json(db.prepare('SELECT * FROM tarefas WHERE id = ?').get(lastInsertRowid));
});

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

app.delete('/tarefas/:id', (req, res) => {
  const { changes } = db.prepare('DELETE FROM tarefas WHERE id = ?').run(req.params.id);
  if (!changes) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
  res.status(204).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TaskUp API em http://localhost:${PORT}`));
