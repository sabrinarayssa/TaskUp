const { randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');

// Nunca guardamos a senha que a pessoa digitou. Em vez disso, criamos um
// "hash": um embaralhamento feito com um salt (valor aleatório). É possível
// conferir a senha depois, mas não é possível descobri-la olhando o banco.
function criarHash(senha) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// Compara a senha digitada com o hash salvo no banco.
function conferirSenha(senha, senhaHash) {
  if (!senhaHash) return false;

  const [salt, hashSalvo] = senhaHash.split(':');
  if (!salt || !hashSalvo) return false;

  const hashDigitado = scryptSync(senha, salt, 64);
  const hashSalvoBuffer = Buffer.from(hashSalvo, 'hex');

  // timingSafeEqual evita que o tempo de resposta revele informações.
  return (
    hashSalvoBuffer.length === hashDigitado.length &&
    timingSafeEqual(hashSalvoBuffer, hashDigitado)
  );
}

module.exports = { criarHash, conferirSenha };
