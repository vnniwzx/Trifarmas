const { getDb } = require('../../lib/db');
const { requireAuth, setCors } = require('../../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    const db = await getDb();
    const { id } = req.query;
    await db.execute({ sql: 'DELETE FROM reminders WHERE id = ? AND user_id = ?', args: [id, user.id] });
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erro interno do servidor.' });
  }
};
