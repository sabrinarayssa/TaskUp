// Endereço da API do TaskUp.
// Quando a página é servida pelo próprio backend (porta 3000 ou URL pública),
// a API fica na mesma origem. No Go Live (porta 5500) ou abrindo o arquivo
// diretamente, usamos o backend local na porta 3000.
const portaAtual = location.port;
const frontendLocal =
  location.protocol === 'file:' || /^550[0-3]$/.test(portaAtual);
const apiLocal = `http://${location.hostname || 'localhost'}:3000`;

window.TASKUP_API =
  window.TASKUP_API || (frontendLocal ? apiLocal : location.origin);
