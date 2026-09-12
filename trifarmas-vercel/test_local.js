// Simula como a Vercel chama as funções serverless (req.body já parseado,
// req.query com querystring + parâmetros de rota, res.status().json()),
// para eu testar a LÓGICA de cada rota sem precisar da Vercel de verdade.
process.env.LOCAL_TEST_DB = '1';
const fs = require('fs');
try { fs.unlinkSync('/tmp/trifarmas-local-test.sqlite'); } catch (e) {}

function mockRes() {
  const res = {
    _status: 200,
    _json: null,
    status(code) { this._status = code; return this; },
    json(obj) { this._json = obj; return this; },
    setHeader() {},
    end() { return this; },
  };
  return res;
}
function mockReq({ method = 'GET', body = {}, query = {}, token = null }) {
  return {
    method, body, query,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
}
async function call(handler, opts) {
  const req = mockReq(opts);
  const res = mockRes();
  await handler(req, res);
  return { status: res._status, body: res._json };
}
function assert(cond, msg) {
  if (!cond) { console.error('❌ FALHOU:', msg); process.exitCode = 1; }
  else console.log('✅', msg);
}

(async () => {
  const signup = require('./api/auth/signup');
  const login = require('./api/auth/login');
  const me = require('./api/me');
  const pharmacies = require('./api/pharmacies');
  const medicines = require('./api/medicines');
  const ordersIndex = require('./api/orders/index');
  const confirmPickup = require('./api/orders/[id]/confirm-pickup');
  const remindersIndex = require('./api/reminders/index');
  const reminderById = require('./api/reminders/[id]');
  const rewardsIndex = require('./api/rewards/index');
  const redeemReward = require('./api/rewards/[id]/redeem');

  // signup
  let r = await call(signup, { method: 'POST', body: { name: 'Ana Vercel', email: 'ana@vercel.com', password: '123456' } });
  assert(r.status === 201 && r.body.token, 'signup cria conta e retorna token');
  const token = r.body.token;
  assert(r.body.user.points === 50, 'signup dá 50 pontos de boas-vindas (recebido: ' + r.body.user.points + ')');

  // signup duplicado
  r = await call(signup, { method: 'POST', body: { name: 'Outra', email: 'ana@vercel.com', password: '123456' } });
  assert(r.status === 409, 'signup duplicado retorna 409');

  // login errado
  r = await call(login, { method: 'POST', body: { email: 'ana@vercel.com', password: 'errada' } });
  assert(r.status === 401, 'login com senha errada retorna 401');

  // login certo
  r = await call(login, { method: 'POST', body: { email: 'ana@vercel.com', password: '123456' } });
  assert(r.status === 200 && r.body.token, 'login certo funciona');

  // me sem token
  r = await call(me, { method: 'GET' });
  assert(r.status === 401, '/me sem token retorna 401');

  // me com token
  r = await call(me, { method: 'GET', token });
  assert(r.status === 200 && r.body.user.email === 'ana@vercel.com', '/me com token retorna o usuário certo');

  // pharmacies
  r = await call(pharmacies, { method: 'GET' });
  assert(r.status === 200 && r.body.pharmacies.length === 6, 'pharmacies retorna as 6 farmácias (recebido: ' + r.body.pharmacies.length + ')');

  // medicines search
  r = await call(medicines, { method: 'GET', query: { search: 'dipirona' } });
  assert(r.status === 200 && r.body.medicines.length === 1, 'busca por "dipirona" encontra 1 remédio');
  const med = r.body.medicines[0];
  assert(med.prices[0].price === 9.9, 'menor preço da dipirona é 9.90 (recebido: ' + med.prices[0].price + ')');
  const bestPharmacyId = med.prices[0].pharmacy_id;

  // criar pedido
  r = await call(ordersIndex, { method: 'POST', token, body: { medicineId: med.id, pharmacyId: bestPharmacyId } });
  assert(r.status === 201, 'criação de pedido retorna 201');
  const orderId = r.body.order.id;
  assert(r.body.order.status === 'Pedido recebido', 'pedido novo começa como "Pedido recebido" (recebido: ' + r.body.order.status + ')');

  // confirmar cedo demais
  r = await call(confirmPickup, { method: 'POST', token, query: { id: orderId } });
  assert(r.status === 409, 'confirmar retirada cedo demais dá 409');

  console.log('aguardando pedido amadurecer (9s)...');
  await new Promise(res => setTimeout(res, 9000));

  r = await call(ordersIndex, { method: 'GET', token });
  const order = r.body.orders.find(o => o.id === orderId);
  assert(order.status === 'Pronto para retirar', 'depois de 9s, status vira "Pronto para retirar" (recebido: ' + order.status + ')');

  // confirmar retirada
  r = await call(confirmPickup, { method: 'POST', token, query: { id: orderId } });
  assert(r.status === 200 && r.body.points === 60, 'confirmar retirada credita pontos (50+10=60, recebido: ' + r.body.points + ')');

  // confirmar de novo
  r = await call(confirmPickup, { method: 'POST', token, query: { id: orderId } });
  assert(r.status === 409, 'confirmar retirada de novo (já concluído) dá 409');

  // lembretes
  r = await call(remindersIndex, { method: 'POST', token, body: { medName: 'Losartana', time: '08:00', day: 10, month: 8, year: 2026 } });
  assert(r.status === 201, 'criar lembrete retorna 201');
  const remId = r.body.reminder.id;

  r = await call(remindersIndex, { method: 'GET', token });
  assert(r.body.reminders.length === 1, 'listar lembretes retorna 1 item');

  r = await call(reminderById, { method: 'DELETE', token, query: { id: remId } });
  assert(r.status === 200, 'deletar lembrete retorna 200');

  r = await call(remindersIndex, { method: 'GET', token });
  assert(r.body.reminders.length === 0, 'lembrete foi removido de verdade');

  // rewards
  r = await call(rewardsIndex, { method: 'GET' });
  assert(r.body.rewards.length === 5, 'lista 5 recompensas');
  const cheapReward = r.body.rewards.find(x => x.name.includes('Frete')); // custa 80

  // usuária tem 60 pontos nesse momento — deve recusar por saldo insuficiente
  r = await call(redeemReward, { method: 'POST', token, query: { id: cheapReward.id } });
  assert(r.status === 409, 'resgatar recompensa mais cara que o saldo dá 409 (pontos insuficientes)');

  // gera mais um pedido pequeno só para ela acumular pontos suficientes
  r = await call(medicines, { method: 'GET', query: { search: 'paracetamol' } });
  const med2 = r.body.medicines[0];
  r = await call(ordersIndex, { method: 'POST', token, body: { medicineId: med2.id, pharmacyId: med2.prices[0].pharmacy_id } });
  const order2Id = r.body.order.id;
  console.log('aguardando 2º pedido amadurecer (9s) para juntar pontos...');
  await new Promise(res => setTimeout(res, 9000));
  await call(confirmPickup, { method: 'POST', token, query: { id: order2Id } });

  // pra não depender de esperar vários pedidos amadurecerem só pra testar o
  // resgate, dou um empurrão direto no saldo (só neste teste) e confirmo
  // que o desconto de pontos do resgate está certo
  const { getDb } = require('./lib/db');
  const db = await getDb();
  await db.execute({ sql: 'UPDATE users SET points = points + 500 WHERE email = ?', args: ['ana@vercel.com'] });

  r = await call(me, { method: 'GET', token });
  const pointsBefore = r.body.user.points;

  r = await call(redeemReward, { method: 'POST', token, query: { id: cheapReward.id } });
  assert(r.status === 200 && r.body.points === pointsBefore - cheapReward.cost,
    `resgate com saldo suficiente desconta certo (${pointsBefore} - ${cheapReward.cost} = ${pointsBefore - cheapReward.cost}, recebido: ${r.body.points})`);

  console.log('\nTodos os testes rodaram.');
})();
