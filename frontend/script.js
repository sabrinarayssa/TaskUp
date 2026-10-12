const estado = { tarefas: [], proximoId: 1 };
const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
const conclusao = document.querySelector('#conclusao');
const form = document.querySelector('#form-tarefa');

function escapar(valor) { const elemento = document.createElement('span'); elemento.textContent = valor; return elemento.innerHTML; }
function dataFormatada(data) { return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR'); }

function renderizar() {
  const total = estado.tarefas.length;
  const finalizadas = estado.tarefas.filter((tarefa) => tarefa.concluida).length;
  document.querySelector('#total').textContent = total;
  document.querySelector('#pendentes').textContent = total - finalizadas;
  document.querySelector('#finalizadas').textContent = finalizadas;
  document.querySelector('#concluidas-menu').textContent = finalizadas;
  document.querySelector('#total-lista').textContent = total;
  document.querySelector('#vazio').classList.toggle('escondido', total !== 0);
  document.querySelector('#lista').innerHTML = estado.tarefas.map((tarefa) => `
    <article class="tarefa ${tarefa.prioridade} ${tarefa.concluida ? 'concluida' : ''}">
      <button class="checkbox" data-concluir="${tarefa.id}" aria-label="Concluir tarefa">${tarefa.concluida ? '✓' : ''}</button>
      <div><h3>${escapar(tarefa.titulo)}</h3><p>${tarefa.prazo ? `Prazo: ${dataFormatada(tarefa.prazo)}` : 'Sem prazo definido'}</p></div>
      <div class="acoes"><button data-editar="${tarefa.id}">Editar</button><button data-excluir="${tarefa.id}">Excluir</button></div>
    </article>`).join('');
}

function abrirFormulario(tarefa) {
  form.reset();
  document.querySelector('#id-tarefa').value = tarefa ? tarefa.id : '';
  document.querySelector('#modal-eyebrow').textContent = tarefa ? 'EDITAR TAREFA' : 'NOVA TAREFA';
  document.querySelector('#modal-titulo').textContent = tarefa ? 'Editar tarefa' : 'Criar tarefa';
  if (tarefa) {
    document.querySelector('#titulo').value = tarefa.titulo;
    document.querySelector('#descricao').value = tarefa.descricao;
    document.querySelector('#prazo').value = tarefa.prazo;
    document.querySelector('#prioridade').value = tarefa.prioridade;
  }
  modal.showModal();
}

document.querySelector('#form-login').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const campoNome = document.querySelector('#nome-login');
  const nome = campoNome.value.trim();
  const telefone = document.querySelector('#telefone-login').value.trim();
  if (!nome || !telefone) return;
  document.querySelector('#nome').textContent = nome;
  document.querySelector('#perfil-nome').textContent = nome;
  document.querySelector('#perfil-telefone').textContent = telefone;
  document.querySelector('#avatar').textContent = nome.slice(0, 2).toUpperCase();
  document.querySelector('#onboarding').classList.add('escondido');
  app.classList.remove('escondido');
});

document.querySelectorAll('.abrir, #nova, #nova-topo').forEach((botao) => botao.addEventListener('click', () => abrirFormulario()));
document.querySelector('#fechar').addEventListener('click', () => modal.close());
document.querySelector('#cancelar').addEventListener('click', () => modal.close());
document.querySelector('#continuar').addEventListener('click', () => conclusao.close());

form.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const id = Number(document.querySelector('#id-tarefa').value);
  const dados = { titulo: document.querySelector('#titulo').value.trim(), descricao: document.querySelector('#descricao').value.trim(), prazo: document.querySelector('#prazo').value, prioridade: document.querySelector('#prioridade').value };
  if (id) Object.assign(estado.tarefas.find((tarefa) => tarefa.id === id), dados);
  else estado.tarefas.push({ ...dados, id: estado.proximoId++, concluida: false });
  modal.close(); renderizar();
});

document.querySelector('#lista').addEventListener('click', (evento) => {
  const botao = evento.target.closest('button'); if (!botao) return;
  const id = Number(botao.dataset.concluir || botao.dataset.editar || botao.dataset.excluir);
  const tarefa = estado.tarefas.find((item) => item.id === id); if (!tarefa) return;
  if (botao.dataset.concluir) { tarefa.concluida = !tarefa.concluida; renderizar(); if (tarefa.concluida) { document.querySelector('#mensagem').textContent = `“${tarefa.titulo}” foi marcada como concluída.`; conclusao.showModal(); } }
  if (botao.dataset.editar) abrirFormulario(tarefa);
  if (botao.dataset.excluir) { estado.tarefas = estado.tarefas.filter((item) => item.id !== id); renderizar(); }
});

renderizar();
