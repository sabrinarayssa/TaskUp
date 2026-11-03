const express = require('express');
const cors = require('cors');
const path = require('node:path');
const tarefasRouter = require('./tarefas/routes');
const usuariosRouter = require('./usuarios/routes');
const categoriaRouter = require('./categoria/routes');

const app = express();
app.use(cors());
app.use(express.json());

// Cada domínio da aplicação tem sua própria pasta em ./src.
app.use('/usuarios', usuariosRouter);
app.use('/tarefas', tarefasRouter);
app.use('/categoria', categoriaRouter);

// O mesmo servidor também entrega o frontend. Assim, localmente ou em uma
// URL pública, a página e a API ficam na mesma origem.
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

// Rota inexistente e erros inesperados sempre respondem em JSON.
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use((erro, req, res, next) => {
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TaskUp API em http://localhost:${PORT}`));
