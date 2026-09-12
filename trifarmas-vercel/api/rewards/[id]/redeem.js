const { getDb } = require('../../../lib/db');
const { requireAuth, setCors } = require('../../../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    const db = await getDb();
    const { id } = req.query;

    const rewardRes = await db.execute({ sql: 'SELECT * FROM rewards WHERE id = ?', args: [id] });
    const reward = rewardRes.rows[0];
    if (!reward) return res.status(404).json({ error: 'Recompensa não encontrada.' });
    if (user.points < reward.cost) return res.status(409).json({ error: 'Pontos insuficientes.' });

    await db.execute({ sql: 'UPDATE users SET points = points - ? WHERE id = ?', args: [reward.cost, user.id] });
    await db.execute({
      sql: 'INSERT INTO points_ledger (user_id, delta, reason) VALUES (?,?,?)',
      args: [user.id, -reward.cost, `Resgate: ${reward.name}`],
    });

    const updated = await db.execute({ sql: 'SELECT points FROM users WHERE id = ?', args: [user.id] });
    res.status(200).json({
      points: Number(updated.rows[0].points),
      reward: { id: Number(reward.id), name: reward.name, description: reward.description, cost: Number(reward.cost) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erro interno do servidor.' });
  }
};
