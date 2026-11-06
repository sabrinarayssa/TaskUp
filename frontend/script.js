// ===================== Configuração =====================
// O endereço da API fica em config.js (window.TASKUP_API).
const API = window.TASKUP_API || 'http://localhost:3000';
const CHAVE_USUARIO = 'taskup.usuario';
const CABECALHO_JSON = { 'Content-Type': 'application/json' };

// ===================== Estado do app =====================
const estado = {
  usuario: { nome: '', telefone: '' }, // quem está "logado" (nome + telefone)
  tarefas: [],                         // tarefas ativas (fora da lixeira)
  lixeira: [],                         // tarefas excluídas
  categorias: [],                      // categorias do usuário
  subtarefas: [],                      // subtarefas da tarefa aberta no checklist
  tarefaSubtarefas: null,              // tarefa cujo checklist está aberto
  tarefasAbertas: new Set(),           // ids das tarefas com detalhes abertos na lista
  subtarefasPorTarefa: {},             // subtarefas carregadas para mostrar na lista
  filtroCategoria: '',                 // id da categoria usada como filtro
  filtroStatus: '',                    // '' | 'pendente' | 'concluida'
  busca: '',                           // texto digitado na busca por título
  categoriaEditando: null,             // id da categoria em edição
  visao: 'ativas',                     // 'ativas' | 'concluidas' | 'lixeira'
};

const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
const modalCategorias = document.querySelector('#modal-categorias');
const modalSubtarefas = document.querySelector('#modal-subtarefas');
const conclusao = document.querySelector('#conclusao');
const form = document.querySelector('#form-tarefa');
const formCategoria = document.querySelector('#form-categoria');
const formSubtarefa = document.querySelector('#form-subtarefa');

// ===================== Utilidades =====================
function escapar(valor) {
  const elemento = document.createElement('span');
  elemento.textContent = valor;
  return elemento.innerHTML;
}

// Compara textos sem diferenciar maiúsculas, minúsculas ou acentos.
function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function dataFormatada(data) {
  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR');
}

function prioridadeFormatada(prioridade) {
  return { baixa: 'Baixa', media: 'Média', alta: 'Alta' }[prioridade] || 'Média';
}

function dataHoraFormatada(valor) {
  const data = new Date(`${valor.replace(' ', 'T')}Z`);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleString('pt-BR');
}

function mensagemDeErro(erro) {
  if (erro instanceof TypeError) {
    return `Não consegui falar com a API em ${API}. Confira se o backend está rodando (npm start na pasta backend).`;
  }
  return erro.message;
}

// Converte um registro do backend para o formato que a tela usa.
function paraTarefa(registro) {
  return {
    id: registro.id,
    titulo: registro.titulo,
    descricao: registro.descricao,
    prazo: registro.prazo,
    prioridade: registro.prioridade || 'media',
    categoriaId: registro.categoria_id,
    categoria: registro.categoria_nome,
    totalSubtarefas: registro.total_subtarefas || 0,
    subtarefasConcluidas: registro.subtarefas_concluidas || 0,
    concluida: registro.status === 'concluida',
    excluidaEm: registro.excluida_em,
  };
}

// Faz uma requisição e já trata respostas de erro (400, 404, 409...).
async function api(caminho, opcoes = {}) {
  const resposta = await fetch(`${API}${caminho}`, opcoes);
  if (resposta.status === 204) return null;

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(dados.erro || `Erro ${resposta.status} na API.`);
  }
  return dados;
}

// ===================== Renderização =====================
function tarefasDaVisao() {
  let lista = estado.tarefas;
  if (estado.visao === 'lixeira') lista = estado.lixeira;
  if (estado.visao === 'concluidas') {
    lista = estado.tarefas.filter((tarefa) => tarefa.concluida);
  }

  if (estado.filtroStatus === 'pendente') {
    lista = lista.filter((tarefa) => !tarefa.concluida);
  }
  if (estado.filtroStatus === 'concluida') {
    lista = lista.filter((tarefa) => tarefa.concluida);
  }

  if (estado.filtroCategoria) {
    lista = lista.filter((tarefa) => String(tarefa.categoriaId) === estado.filtroCategoria);
  }

  const busca = normalizarTexto(estado.busca.trim());
  if (busca) {
    lista = lista.filter((tarefa) => normalizarTexto(tarefa.titulo).includes(busca));
  }

  return lista;
}

function progressoSubtarefas(tarefa) {
  if (!tarefa.totalSubtarefas) return '';
  return `<span class="chip progresso">☑ ${tarefa.subtarefasConcluidas}/${tarefa.totalSubtarefas}</span> `;
}

function renderizarSubtarefasInline(tarefa, subtarefas) {
  if (!tarefa.totalSubtarefas) {
    return '<p class="detalhes-vazio">Nenhuma subtarefa cadastrada.</p>';
  }
  if (!subtarefas) {
    return '<p class="detalhes-vazio">Carregando subtarefas...</p>';
  }

  return `<div class="lista-subtarefas-inline">${subtarefas
    .map(
      (subtarefa) => `
        <div class="subtarefa ${subtarefa.concluida ? 'concluida' : ''}">
          <button class="checkbox" data-concluir-subtarefa-inline="${subtarefa.id}" data-tarefa-id="${tarefa.id}" aria-label="${subtarefa.concluida ? 'Reabrir' : 'Concluir'} subtarefa">${subtarefa.concluida ? '✓' : ''}</button>
          <span>${escapar(subtarefa.titulo)}</span>
        </div>`,
    )
    .join('')}</div>`;
}

function cardTarefa(tarefa) {
  const categoria = tarefa.categoria
    ? `<span class="chip">${escapar(tarefa.categoria)}</span> `
    : '';
  const prazo = tarefa.prazo ? `Prazo: ${dataFormatada(tarefa.prazo)}` : 'Sem prazo definido';
  const aberta = estado.tarefasAbertas.has(tarefa.id);
  const subtarefas = estado.subtarefasPorTarefa[tarefa.id];

  const detalhes = aberta
    ? `<div class="detalhes-tarefa">
        ${tarefa.descricao ? `<p class="descricao">${escapar(tarefa.descricao)}</p>` : ''}
        <p class="detalhes-meta">Prioridade: ${prioridadeFormatada(tarefa.prioridade)} · ${tarefa.prazo ? `Prazo: ${dataFormatada(tarefa.prazo)}` : 'Sem prazo'}</p>
        ${renderizarSubtarefasInline(tarefa, subtarefas)}
      </div>`
    : '';

  return `
    <article class="tarefa ${tarefa.prioridade} ${tarefa.concluida ? 'concluida' : ''}" data-tarefa="${tarefa.id}">
      <button class="checkbox" data-concluir="${tarefa.id}" aria-label="${tarefa.concluida ? 'Reabrir' : 'Concluir'} tarefa">${tarefa.concluida ? '✓' : ''}</button>
      <div><h3>${escapar(tarefa.titulo)} <span class="chevron" aria-hidden="true">${aberta ? '▾' : '▸'}</span></h3><p>${categoria}${progressoSubtarefas(tarefa)}${prazo}</p></div>
      <div class="acoes"><button data-subtarefas="${tarefa.id}">Subtarefas</button><button data-editar="${tarefa.id}">Editar</button><button data-excluir="${tarefa.id}">Excluir</button></div>
      ${detalhes}
    </article>`;
}

function cardLixeira(tarefa) {
  const categoria = tarefa.categoria
    ? `<span class="chip">${escapar(tarefa.categoria)}</span> `
    : '';

  return `
    <article class="tarefa">
      <div><h3>${escapar(tarefa.titulo)}</h3><p>${categoria}${progressoSubtarefas(tarefa)}Excluída em ${dataHoraFormatada(tarefa.excluidaEm)}</p></div>
      <div class="acoes"><button data-restaurar="${tarefa.id}">Restaurar</button><button data-definitivo="${tarefa.id}">Excluir de vez</button></div>
    </article>`;
}

function atualizarVazio(quantidade) {
  const textos = {
    ativas: [
      'Nenhuma tarefa por enquanto',
      'Quando quiser, crie sua primeira tarefa para começar a se organizar.',
    ],
    concluidas: [
      'Nenhuma tarefa concluída',
      'Marque uma tarefa como concluída para vê-la aqui.',
    ],
    lixeira: [
      'A lixeira está vazia',
      'As tarefas excluídas ficam aqui e podem ser restauradas.',
    ],
  };

  let [titulo, texto] = textos[estado.visao];
  const busca = estado.busca.trim();
  const temFiltros = Boolean(busca || estado.filtroStatus || estado.filtroCategoria);

  if (busca) {
    titulo = 'Nenhuma tarefa encontrada';
    texto = `Nenhuma tarefa corresponde a “${busca}”.`;
  } else if (estado.filtroStatus) {
    titulo = 'Nenhuma tarefa com este status';
    texto = 'Escolha outro status ou crie uma tarefa.';
  } else if (estado.filtroCategoria) {
    titulo = 'Nenhuma tarefa nesta categoria';
    texto =
      estado.visao === 'lixeira'
        ? 'Nenhuma tarefa excluída usa esta categoria.'
        : 'Escolha outra categoria ou crie uma tarefa com esta categoria.';
  }

  document.querySelector('#vazio').classList.toggle('escondido', quantidade !== 0);
  document.querySelector('#vazio-titulo').textContent = titulo;
  document.querySelector('#vazio-texto').textContent = texto;
  document.querySelector('#vazio-criar').classList.toggle(
    'escondido',
    estado.visao !== 'ativas' || temFiltros,
  );
}

function preencherCategorias() {
  const filtro = document.querySelector('#filtro-categoria');
  const selectTarefa = document.querySelector('#categoria');
  const filtroAtual = estado.filtroCategoria;
  const categoriaAtual = selectTarefa.value;
  const opcoes = estado.categorias
    .map((categoria) => `<option value="${categoria.id}">${escapar(categoria.nome)}</option>`)
    .join('');

  filtro.innerHTML = `<option value="">Todas as categorias</option>${opcoes}`;
  selectTarefa.innerHTML = `<option value="">Sem categoria</option>${opcoes}`;

  filtro.value = estado.categorias.some((categoria) => String(categoria.id) === filtroAtual)
    ? filtroAtual
    : '';
  estado.filtroCategoria = filtro.value;

  selectTarefa.value = estado.categorias.some(
    (categoria) => String(categoria.id) === categoriaAtual,
  )
    ? categoriaAtual
    : '';
}

function renderizarCategorias() {
  document.querySelector('#lista-categorias').innerHTML = estado.categorias
    .map(
      (categoria) => `
        <div class="categoria-item">
          <div><strong>${escapar(categoria.nome)}</strong><small>${categoria.total_tarefas} tarefa(s)</small></div>
          <div class="acoes"><button data-editar-categoria="${categoria.id}" title="Editar o nome da categoria">Editar</button><button data-excluir-categoria="${categoria.id}">Excluir</button></div>
        </div>`,
    )
    .join('');

  document
    .querySelector('#categorias-vazio')
    .classList.toggle('escondido', estado.categorias.length > 0);
}

function renderizar() {
  const total = estado.tarefas.length;
  const finalizadas = estado.tarefas.filter((tarefa) => tarefa.concluida).length;

  document.querySelector('#total').textContent = total;
  document.querySelector('#pendentes').textContent = total - finalizadas;
  document.querySelector('#finalizadas').textContent = finalizadas;
  document.querySelector('#concluidas-menu').textContent = finalizadas;
  document.querySelector('#lixeira-menu').textContent = estado.lixeira.length;

  const titulos = {
    ativas: 'Minhas tarefas',
    concluidas: 'Concluídas',
    lixeira: 'Lixeira',
  };
  const lista = tarefasDaVisao();

  document.querySelector('#titulo-lista').textContent = titulos[estado.visao];
  document.querySelector('#total-lista').textContent = lista.length;
  document.querySelectorAll('[data-visao]').forEach((botao) => {
    botao.classList.toggle('ativo', botao.dataset.visao === estado.visao);
  });

  atualizarVazio(lista.length);
  document.querySelector('#lista').innerHTML = lista
    .map(estado.visao === 'lixeira' ? cardLixeira : cardTarefa)
    .join('');

  preencherCategorias();
  renderizarCategorias();
}

// ===================== Serviços (conexão com o backend) =====================
function filtroDoUsuario() {
  const { nome, telefone } = estado.usuario;
  return `nome=${encodeURIComponent(nome)}&telefone=${encodeURIComponent(telefone)}`;
}

async function carregarTarefas() {
  const registros = await api(`/tarefas?${filtroDoUsuario()}`);
  estado.tarefas = registros.map(paraTarefa);
  renderizar();
}

async function carregarLixeira() {
  const registros = await api(`/tarefas/lixeira?${filtroDoUsuario()}`);
  estado.lixeira = registros.map(paraTarefa);
  renderizar();
}

async function carregarCategorias() {
  estado.categorias = await api(`/categoria?${filtroDoUsuario()}`);
  renderizar();
}

async function carregarTudo() {
  await Promise.all([carregarTarefas(), carregarLixeira(), carregarCategorias()]);
}

// ===================== Login (onboarding) =====================
// 'entrar' confere a senha de uma conta existente.
// 'criar' cadastra uma conta nova com senha.
let modoLogin = 'entrar';

function abrirApp(usuario) {
  estado.usuario = usuario;
  document.querySelector('#nome').textContent = usuario.nome;
  document.querySelector('#perfil-nome').textContent = usuario.nome;
  document.querySelector('#perfil-telefone').textContent = usuario.telefone;
  document.querySelector('#avatar').textContent = usuario.nome.slice(0, 2).toUpperCase();
  document.querySelector('#onboarding').classList.add('escondido');
  app.classList.remove('escondido');
}

function mostrarErroLogin(mensagem) {
  const erro = document.querySelector('#erro-login');
  erro.textContent = mensagem;
  erro.classList.remove('escondido');
}

function limparErroLogin() {
  const erro = document.querySelector('#erro-login');
  erro.textContent = '';
  erro.classList.add('escondido');
}

// Atualiza os textos conforme a pessoa escolheu entrar ou criar conta.
function atualizarModoLogin() {
  const criar = modoLogin === 'criar';

  document.querySelector('#botao-login').textContent = criar ? 'Criar conta →' : 'Entrar →';
  document.querySelector('#alternar-modo').textContent = criar
    ? 'Já tem conta? Entrar'
    : 'Ainda não tem conta? Criar conta';
  document.querySelector('#senha-login').autocomplete = criar
    ? 'new-password'
    : 'current-password';
  document.querySelector('#dica-login').textContent = criar
    ? 'A senha precisa ter pelo menos 6 caracteres e fica guardada criptografada.'
    : 'Sua senha fica guardada criptografada no servidor. Nome e telefone identificam suas tarefas.';

  limparErroLogin();
}

document.querySelector('#alternar-modo').addEventListener('click', () => {
  modoLogin = modoLogin === 'criar' ? 'entrar' : 'criar';
  atualizarModoLogin();
});

// Envia nome, telefone e senha para o backend.
// No modo 'criar', cadastra; no modo 'entrar', confere a senha.
async function autenticar(nome, telefone, senha) {
  const rota = modoLogin === 'criar' ? '/usuarios' : '/usuarios/login';
  const resposta = await fetch(`${API}${rota}`, {
    method: 'POST',
    headers: CABECALHO_JSON,
    body: JSON.stringify({ nome, telefone, senha }),
  });

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(dados.erro || 'Não foi possível entrar.');
  }

  const usuario = { nome: dados.nome, telefone: dados.telefone, senhaOk: true };

  // Carrega os dados antes de esconder a tela de login. Se a API falhar,
  // a pessoa continua no login e vê a mensagem de erro.
  estado.usuario = usuario;
  await carregarTudo();

  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  abrirApp(usuario);
}

function lerUsuarioSalvo() {
  try {
    const usuario = JSON.parse(localStorage.getItem(CHAVE_USUARIO));
    // senhaOk garante que sessões antigas (antes da senha) peçam login de novo.
    return usuario?.nome && usuario?.telefone && usuario?.senhaOk ? usuario : null;
  } catch {
    return null;
  }
}

function sair() {
  localStorage.removeItem(CHAVE_USUARIO);
  estado.usuario = { nome: '', telefone: '' };
  estado.tarefas = [];
  estado.lixeira = [];
  estado.categorias = [];
  estado.subtarefas = [];
  estado.tarefaSubtarefas = null;
  estado.tarefasAbertas = new Set();
  estado.subtarefasPorTarefa = {};
  estado.filtroCategoria = '';
  estado.filtroStatus = '';
  estado.busca = '';
  estado.visao = 'ativas';
  document.querySelector('#busca').value = '';
  document.querySelector('#filtro-status').value = '';
  if (modal.open) modal.close();
  if (modalCategorias.open) modalCategorias.close();
  if (modalSubtarefas.open) modalSubtarefas.close();
  if (conclusao.open) conclusao.close();
  resetarEdicaoCategoria();
  app.classList.add('escondido');
  document.querySelector('#onboarding').classList.remove('escondido');
  document.querySelector('#form-login').reset();
  modoLogin = 'entrar';
  atualizarModoLogin();
  renderizar();
}

document.querySelector('#form-login').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const nome = document.querySelector('#nome-login').value.trim();
  const telefone = document.querySelector('#telefone-login').value.trim();
  const senha = document.querySelector('#senha-login').value;
  if (!nome || !telefone || !senha) return;

  limparErroLogin();
  const botao = document.querySelector('#botao-login');
  botao.disabled = true;

  try {
    await autenticar(nome, telefone, senha);
  } catch (erro) {
    mostrarErroLogin(mensagemDeErro(erro));
  } finally {
    botao.disabled = false;
  }
});

document.querySelector('#sair').addEventListener('click', sair);
document.querySelector('#sair-mobile').addEventListener('click', sair);
document.querySelector('#abrir-categorias-mobile').addEventListener('click', () => {
  document.querySelector('#abrir-categorias').click();
});

// ===================== Ações da tela =====================
function abrirFormulario(tarefa) {
  form.reset();
  document.querySelector('#id-tarefa').value = tarefa ? tarefa.id : '';
  document.querySelector('#modal-eyebrow').textContent = tarefa ? 'EDITAR TAREFA' : 'NOVA TAREFA';
  document.querySelector('#modal-titulo').textContent = tarefa ? 'Editar tarefa' : 'Criar tarefa';
  if (tarefa) {
    document.querySelector('#titulo').value = tarefa.titulo;
    document.querySelector('#descricao').value = tarefa.descricao || '';
    document.querySelector('#prazo').value = tarefa.prazo || '';
    document.querySelector('#prioridade').value = tarefa.prioridade;
  }
  document.querySelector('#categoria').value = tarefa?.categoriaId
    ? String(tarefa.categoriaId)
    : '';
  modal.showModal();
}

document.querySelectorAll('[data-visao]').forEach((botao) => {
  botao.addEventListener('click', () => {
    estado.visao = botao.dataset.visao;
    renderizar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

document.querySelectorAll('.abrir, #nova').forEach((botao) => {
  botao.addEventListener('click', () => abrirFormulario());
});
document.querySelector('#fechar').addEventListener('click', () => modal.close());
document.querySelector('#cancelar').addEventListener('click', () => modal.close());
document.querySelector('#continuar').addEventListener('click', () => conclusao.close());

// ===================== Categorias =====================
function resetarEdicaoCategoria() {
  estado.categoriaEditando = null;
  document.querySelector('#nome-categoria').value = '';
  document.querySelector('#salvar-categoria').textContent = 'Adicionar';
  document.querySelector('#cancelar-categoria').classList.add('escondido');
}

function editarCategoria(categoria) {
  estado.categoriaEditando = categoria.id;
  const input = document.querySelector('#nome-categoria');
  input.value = categoria.nome;
  document.querySelector('#salvar-categoria').textContent = 'Salvar';
  document.querySelector('#cancelar-categoria').classList.remove('escondido');
  input.focus();
}

// Cria uma categoria sem sair do formulário de tarefa.
async function criarCategoriaRapida() {
  const nome = prompt('Nome da nova categoria:');
  if (!nome || !nome.trim()) return;

  try {
    const categoria = await api('/categoria', {
      method: 'POST',
      headers: CABECALHO_JSON,
      body: JSON.stringify({
        categoria: nome.trim(),
        nome: estado.usuario.nome,
        telefone: estado.usuario.telefone,
      }),
    });
    await carregarCategorias();
    document.querySelector('#categoria').value = String(categoria.id);
  } catch (erro) {
    alert(mensagemDeErro(erro));
  }
}

document.querySelector('#nova-categoria-tarefa').addEventListener('click', criarCategoriaRapida);

document.querySelector('#abrir-categorias').addEventListener('click', async () => {
  resetarEdicaoCategoria();
  try {
    await carregarCategorias();
    modalCategorias.showModal();
  } catch (erro) {
    alert(mensagemDeErro(erro));
  }
});

document.querySelector('#fechar-categorias').addEventListener('click', () => modalCategorias.close());
document.querySelector('#cancelar-categoria').addEventListener('click', resetarEdicaoCategoria);
modalCategorias.addEventListener('close', resetarEdicaoCategoria);

formCategoria.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const nomeCategoria = document.querySelector('#nome-categoria').value.trim();
  if (!nomeCategoria) return;

  try {
    if (estado.categoriaEditando) {
      await api(`/categoria/${estado.categoriaEditando}`, {
        method: 'PUT',
        headers: CABECALHO_JSON,
        body: JSON.stringify({ categoria: nomeCategoria }),
      });
    } else {
      await api('/categoria', {
        method: 'POST',
        headers: CABECALHO_JSON,
        body: JSON.stringify({
          categoria: nomeCategoria,
          nome: estado.usuario.nome,
          telefone: estado.usuario.telefone,
        }),
      });
    }

    resetarEdicaoCategoria();
    await carregarTudo();
  } catch (erro) {
    alert(mensagemDeErro(erro));
  }
});

document.querySelector('#lista-categorias').addEventListener('click', async (evento) => {
  const botao = evento.target.closest('button');
  if (!botao) return;

  const { editarCategoria: idEditar, excluirCategoria: idExcluir } = botao.dataset;
  const id = Number(idEditar || idExcluir);
  const categoria = estado.categorias.find((item) => item.id === id);
  if (!categoria) return;

  if (idEditar) editarCategoria(categoria);

  if (idExcluir) {
    if (!confirm(`Excluir a categoria “${categoria.nome}”? As tarefas dela ficarão sem categoria.`)) {
      return;
    }
    try {
      await api(`/categoria/${categoria.id}`, { method: 'DELETE' });
      if (estado.categoriaEditando === categoria.id) resetarEdicaoCategoria();
      await carregarTudo();
    } catch (erro) {
      alert(mensagemDeErro(erro));
    }
  }
});

document.querySelector('#filtro-categoria').addEventListener('change', (evento) => {
  estado.filtroCategoria = evento.target.value;
  renderizar();
});

document.querySelector('#filtro-status').addEventListener('change', (evento) => {
  estado.filtroStatus = evento.target.value;
  renderizar();
});

document.querySelector('#busca').addEventListener('input', (evento) => {
  estado.busca = evento.target.value;
  renderizar();
});

// ===================== Subtarefas =====================
function renderizarSubtarefas() {
  const total = estado.subtarefas.length;
  const concluidas = estado.subtarefas.filter((subtarefa) => subtarefa.concluida).length;

  document.querySelector('#subtarefas-progresso').textContent =
    `${concluidas} de ${total} concluída${total === 1 ? '' : 's'}`;
  document.querySelector('#subtarefas-vazio').classList.toggle('escondido', total > 0);
  document.querySelector('#lista-subtarefas').innerHTML = estado.subtarefas
    .map(
      (subtarefa) => `
        <div class="subtarefa ${subtarefa.concluida ? 'concluida' : ''}">
          <button class="checkbox" data-concluir-subtarefa="${subtarefa.id}" aria-label="${subtarefa.concluida ? 'Reabrir' : 'Concluir'} subtarefa">${subtarefa.concluida ? '✓' : ''}</button>
          <span>${escapar(subtarefa.titulo)}</span>
          <button class="remover-subtarefa" data-excluir-subtarefa="${subtarefa.id}" aria-label="Excluir subtarefa">×</button>
        </div>`,
    )
    .join('');
}

async function carregarSubtarefas(tarefaId) {
  estado.subtarefas = await api(`/tarefas/${tarefaId}/subtarefas`);
  estado.subtarefasPorTarefa[tarefaId] = estado.subtarefas;
  renderizarSubtarefas();
}

async function abrirSubtarefas(tarefa) {
  estado.tarefaSubtarefas = tarefa;
  estado.subtarefas = [];
  document.querySelector('#subtarefas-tarefa').textContent = tarefa.titulo;
  document.querySelector('#titulo-subtarefa').value = '';
  renderizarSubtarefas();

  try {
    await carregarSubtarefas(tarefa.id);
    modalSubtarefas.showModal();
  } catch (erro) {
    estado.tarefaSubtarefas = null;
    alert(mensagemDeErro(erro));
  }
}

document.querySelector('#fechar-subtarefas').addEventListener('click', () => modalSubtarefas.close());

modalSubtarefas.addEventListener('close', () => {
  estado.tarefaSubtarefas = null;
  estado.subtarefas = [];
  document.querySelector('#lista-subtarefas').innerHTML = '';
  document.querySelector('#titulo-subtarefa').value = '';
});

formSubtarefa.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const titulo = document.querySelector('#titulo-subtarefa').value.trim();
  const tarefa = estado.tarefaSubtarefas;
  if (!titulo || !tarefa) return;

  try {
    await api(`/tarefas/${tarefa.id}/subtarefas`, {
      method: 'POST',
      headers: CABECALHO_JSON,
      body: JSON.stringify({ titulo }),
    });
    document.querySelector('#titulo-subtarefa').value = '';
    await carregarSubtarefas(tarefa.id);
    await carregarTarefas();
    document.querySelector('#titulo-subtarefa').focus();
  } catch (erro) {
    alert(mensagemDeErro(erro));
  }
});

document.querySelector('#lista-subtarefas').addEventListener('click', async (evento) => {
  const botao = evento.target.closest('button');
  if (!botao) return;

  const { concluirSubtarefa, excluirSubtarefa } = botao.dataset;
  const id = Number(concluirSubtarefa || excluirSubtarefa);
  const tarefa = estado.tarefaSubtarefas;
  if (!tarefa) return;

  const subtarefa = estado.subtarefas.find((item) => item.id === id);
  if (!subtarefa) return;

  try {
    if (concluirSubtarefa) {
      await api(`/tarefas/${tarefa.id}/subtarefas/${subtarefa.id}`, {
        method: 'PUT',
        headers: CABECALHO_JSON,
        body: JSON.stringify({ concluida: !subtarefa.concluida }),
      });
      await carregarSubtarefas(tarefa.id);
      await carregarTarefas();
    }

    if (excluirSubtarefa) {
      if (!confirm(`Excluir a subtarefa “${subtarefa.titulo}”?`)) return;
      await api(`/tarefas/${tarefa.id}/subtarefas/${subtarefa.id}`, { method: 'DELETE' });
      await carregarSubtarefas(tarefa.id);
      await carregarTarefas();
    }
  } catch (erro) {
    alert(mensagemDeErro(erro));
  }
});

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const id = Number(document.querySelector('#id-tarefa').value);
  const categoria = document.querySelector('#categoria').value;
  const dados = {
    titulo: document.querySelector('#titulo').value.trim(),
    descricao: document.querySelector('#descricao').value.trim() || null,
    prazo: document.querySelector('#prazo').value || null,
    prioridade: document.querySelector('#prioridade').value,
    categoria_id: categoria ? Number(categoria) : null,
  };
  if (!dados.titulo) return;

  try {
    if (id) {
      await api(`/tarefas/${id}`, {
        method: 'PUT',
        headers: CABECALHO_JSON,
        body: JSON.stringify(dados),
      });
    } else {
      await api('/tarefas', {
        method: 'POST',
        headers: CABECALHO_JSON,
        body: JSON.stringify({
          ...dados,
          nome: estado.usuario.nome,
          telefone: estado.usuario.telefone,
        }),
      });
      estado.visao = 'ativas';
      estado.filtroCategoria = '';
      estado.filtroStatus = '';
      estado.busca = '';
      document.querySelector('#busca').value = '';
      document.querySelector('#filtro-status').value = '';
    }

    modal.close();
    await carregarTudo();
  } catch (erro) {
    alert(mensagemDeErro(erro));
  }
});

document.querySelector('#lista').addEventListener('click', async (evento) => {
  const botaoSubtarefa = evento.target.closest('[data-concluir-subtarefa-inline]');
  if (botaoSubtarefa) {
    const tarefaId = Number(botaoSubtarefa.dataset.tarefaId);
    const subtarefaId = Number(botaoSubtarefa.dataset.concluirSubtarefaInline);
    const subtarefa = (estado.subtarefasPorTarefa[tarefaId] || []).find(
      (item) => item.id === subtarefaId,
    );
    if (!subtarefa) return;

    try {
      await api(`/tarefas/${tarefaId}/subtarefas/${subtarefaId}`, {
        method: 'PUT',
        headers: CABECALHO_JSON,
        body: JSON.stringify({ concluida: !subtarefa.concluida }),
      });
      estado.subtarefasPorTarefa[tarefaId] = await api(`/tarefas/${tarefaId}/subtarefas`);
      await carregarTarefas();
    } catch (erro) {
      alert(mensagemDeErro(erro));
    }
    return;
  }

  const botao = evento.target.closest('button');
  if (!botao) {
    if (estado.visao === 'lixeira' || evento.target.closest('.detalhes-tarefa')) return;

    const cartao = evento.target.closest('.tarefa[data-tarefa]');
    if (!cartao) return;

    const tarefaId = Number(cartao.dataset.tarefa);
    if (estado.tarefasAbertas.has(tarefaId)) {
      estado.tarefasAbertas.delete(tarefaId);
      renderizar();
      return;
    }

    estado.tarefasAbertas.add(tarefaId);
    renderizar();

    if (!estado.subtarefasPorTarefa[tarefaId]) {
      try {
        estado.subtarefasPorTarefa[tarefaId] = await api(`/tarefas/${tarefaId}/subtarefas`);
        renderizar();
      } catch (erro) {
        estado.tarefasAbertas.delete(tarefaId);
        renderizar();
        alert(mensagemDeErro(erro));
      }
    }
    return;
  }

  const { concluir, editar, excluir, restaurar, definitivo, subtarefas: gerenciarSubtarefas } =
    botao.dataset;
  const id = Number(
    concluir || editar || excluir || restaurar || definitivo || gerenciarSubtarefas,
  );
  const tarefa = [...estado.tarefas, ...estado.lixeira].find((item) => item.id === id);
  if (!tarefa) return;

  try {
    if (gerenciarSubtarefas) abrirSubtarefas(tarefa);

    if (concluir) {
      const concluida = !tarefa.concluida;
      await api(`/tarefas/${tarefa.id}`, {
        method: 'PUT',
        headers: CABECALHO_JSON,
        body: JSON.stringify({ status: concluida ? 'concluida' : 'pendente' }),
      });
      await carregarTudo();
      if (concluida) {
        document.querySelector('#mensagem').textContent = `“${tarefa.titulo}” foi marcada como concluída.`;
        conclusao.showModal();
      }
    }

    if (editar) abrirFormulario(tarefa);

    if (excluir) {
      if (!confirm(`Mover “${tarefa.titulo}” para a lixeira?`)) return;
      await api(`/tarefas/${tarefa.id}`, { method: 'DELETE' });
      await carregarTudo();
    }

    if (restaurar) {
      await api(`/tarefas/${tarefa.id}/restaurar`, { method: 'PUT' });
      await carregarTudo();
    }

    if (definitivo) {
      if (!confirm(`Excluir “${tarefa.titulo}” de vez? Esta ação não pode ser desfeita.`)) return;
      await api(`/tarefas/${tarefa.id}/definitivo`, { method: 'DELETE' });
      delete estado.subtarefasPorTarefa[tarefa.id];
      estado.tarefasAbertas.delete(tarefa.id);
      await carregarLixeira();
    }
  } catch (erro) {
    alert(mensagemDeErro(erro));
  }
});

// ===================== Inicialização =====================
async function iniciar() {
  const usuarioSalvo = lerUsuarioSalvo();
  if (!usuarioSalvo) {
    renderizar();
    return;
  }

  abrirApp(usuarioSalvo);
  try {
    await carregarTudo();
  } catch (erro) {
    alert('Erro: ' + mensagemDeErro(erro));
    sair();
  }
}

atualizarModoLogin();
iniciar();
