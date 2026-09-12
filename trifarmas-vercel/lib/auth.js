// lib/auth.js — helpers de autenticação compartilhados entre as funções serverless
const crypto = require('node:crypto');
const { getDb } = require('./db');

const SESSION_DAYS = 30;

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}
function makeCredentials(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: hashPassword(password, salt) };
}
function verifyPassword(password, salt, hash) {
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

async function createSession(userId) {
  const db = await getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString();
  await db.execute({ sql: 'INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)', args: [token, userId, expires] });
  return token;
}

async function userFromToken(token) {
  if (!token) return null;
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token = ? AND s.expires_at > datetime('now')`,
    args: [token],
  });
  return res.rows[0] || null;
}

function publicUser(u) {
  return { id: Number(u.id), name: u.name, email: u.email, avatar: u.avatar, points: Number(u.points) };
}

function getBearer(req) {
  const h = req.headers['authorization'] || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

async function requireAuth(req, res) {
  const user = await userFromToken(getBearer(req));
  if (!user) { res.status(401).json({ error: 'Não autenticado.' }); return null; }
  return user;
}

// deriva o status "ao vivo" do pedido a partir do tempo decorrido desde a
// criação — o mesmo comportamento da versão Node.js tradicional.
function effectiveOrderStatus(order) {
  if (order.status === 'Concluído') return 'Concluído';
  const elapsedMs = Date.now() - new Date(order.created_at + 'Z').getTime();
  if (elapsedMs < 3500) return 'Pedido recebido';
  if (elapsedMs < 8000) return 'Em preparação';
  return 'Pronto para retirar';
}

function formatOrder(o) {
  return {
    id: Number(o.id),
    medName: o.med_name,
    pharmName: o.pharm_name,
    price: o.price,
    points: Number(o.points_value),
    code: o.pickup_code,
    status: effectiveOrderStatus(o),
    createdAt: o.created_at,
  };
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
}

module.exports = {
  makeCredentials, verifyPassword, createSession, userFromToken,
  publicUser, getBearer, requireAuth, effectiveOrderStatus, formatOrder, setCors,
};
