const { getDb } = require('../../lib/db');
const { getBearer, setCors } = require('../../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const token = getBearer(req);
    if (token) {
      const db = await getDb();
      await db.execute({ sql: 'DELETE FROM sessions WHERE token = ?', args: [token] });
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erro interno do servidor.' });
  }
};
