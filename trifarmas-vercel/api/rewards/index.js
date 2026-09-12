const { getDb } = require('../../lib/db');
const { setCors } = require('../../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const db = await getDb();
    const result = await db.execute('SELECT * FROM rewards');
    res.status(200).json({ rewards: result.rows.map(r => ({ id: Number(r.id), name: r.name, description: r.description, cost: Number(r.cost) })) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erro interno do servidor.' });
  }
};
