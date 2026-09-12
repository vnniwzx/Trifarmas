const { getDb } = require('../../lib/db');
const { makeCredentials, createSession, publicUser, setCors } = require('../../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const body = req.body || {};
  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!name || !email || !password) return res.status(400).json({ error: 'Preencha nome, e-mail e senha.' });
  if (password.length < 6) return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });

  try {
    const db = await getDb();
    const exists = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email] });
    if (exists.rows.length) return res.status(409).json({ error: 'Já existe uma conta com esse e-mail.' });

    const { salt, hash } = makeCredentials(password);
    const avatar = body.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=2fa85e&textColor=ffffff`;
    const insert = await db.execute({
      sql: 'INSERT INTO users (name, email, password_hash, password_salt, avatar, points) VALUES (?,?,?,?,?,?)',
      args: [name, email, hash, salt, avatar, 50],
    });
    const userId = Number(insert.lastInsertRowid);
    await db.execute({ sql: 'INSERT INTO points_ledger (user_id, delta, reason) VALUES (?,?,?)', args: [userId, 50, 'Bônus de boas-vindas'] });

    const token = await createSession(userId);
    const userRow = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [userId] });
    res.status(201).json({ token, user: publicUser(userRow.rows[0]) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erro interno do servidor.' });
  }
};
