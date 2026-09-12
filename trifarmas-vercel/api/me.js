const { getDb } = require('../lib/db');
const { requireAuth, publicUser, setCors } = require('../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    const db = await getDb();

    if (req.method === 'GET') {
      return res.status(200).json({ user: publicUser(user) });
    }

    if (req.method === 'PATCH') {
      const body = req.body || {};
      const name = body.name != null ? String(body.name).trim() : user.name;
      const email = body.email != null ? String(body.email).trim().toLowerCase() : user.email;
      const avatar = body.avatar != null ? body.avatar : user.avatar;

      if (email !== user.email) {
        const taken = await db.execute({ sql: 'SELECT id FROM users WHERE email = ? AND id != ?', args: [email, user.id] });
        if (taken.rows.length) return res.status(409).json({ error: 'Esse e-mail já está em uso.' });
      }

      if (body.password) {
        if (String(body.password).length < 6) return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });
        const { makeCredentials } = require('../lib/auth');
        const { salt, hash } = makeCredentials(body.password);
        await db.execute({
          sql: 'UPDATE users SET name=?, email=?, avatar=?, password_hash=?, password_salt=? WHERE id=?',
          args: [name, email, avatar, hash, salt, user.id],
        });
      } else {
        await db.execute({ sql: 'UPDATE users SET name=?, email=?, avatar=? WHERE id=?', args: [name, email, avatar, user.id] });
      }
      const updated = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [user.id] });
      return res.status(200).json({ user: publicUser(updated.rows[0]) });
    }

    res.status(405).json({ error: 'Método não permitido.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erro interno do servidor.' });
  }
};
