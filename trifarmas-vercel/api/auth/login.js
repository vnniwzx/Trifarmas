const { getDb } = require('../../lib/db');
const { verifyPassword, createSession, publicUser, setCors } = require('../../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const body = req.body || {};
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  try {
    const db = await getDb();
    const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }
    const token = await createSession(Number(user.id));
    res.status(200).json({ token, user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erro interno do servidor.' });
  }
};
