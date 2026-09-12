const { getDb } = require('../../../lib/db');
const { requireAuth, effectiveOrderStatus, formatOrder, setCors } = require('../../../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    const db = await getDb();
    const { id } = req.query;

    const orderRes = await db.execute({ sql: 'SELECT * FROM orders WHERE id = ? AND user_id = ?', args: [id, user.id] });
    const order = orderRes.rows[0];
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
    if (order.status === 'Concluído') return res.status(409).json({ error: 'Esse pedido já foi concluído.' });
    if (effectiveOrderStatus(order) !== 'Pronto para retirar') {
      return res.status(409).json({ error: 'Esse pedido ainda não está pronto para retirada.' });
    }

    await db.execute({ sql: `UPDATE orders SET status='Concluído', concluded_at=datetime('now') WHERE id=?`, args: [order.id] });
    await db.execute({
      sql: 'INSERT INTO points_ledger (user_id, delta, reason, order_id) VALUES (?,?,?,?)',
      args: [user.id, order.points_value, 'Retirada confirmada', order.id],
    });
    await db.execute({ sql: 'UPDATE users SET points = points + ? WHERE id = ?', args: [order.points_value, user.id] });

    const updatedUser = await db.execute({ sql: 'SELECT points FROM users WHERE id = ?', args: [user.id] });
    const updatedOrder = await db.execute({
      sql: `SELECT o.*, m.name as med_name, ph.name as pharm_name FROM orders o
            JOIN medicines m ON m.id=o.medicine_id JOIN pharmacies ph ON ph.id=o.pharmacy_id WHERE o.id = ?`,
      args: [order.id],
    });
    res.status(200).json({
      order: formatOrder(updatedOrder.rows[0]),
      points: Number(updatedUser.rows[0].points),
      earned: Number(order.points_value),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erro interno do servidor.' });
  }
};
