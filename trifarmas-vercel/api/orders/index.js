const { getDb } = require('../../lib/db');
const { requireAuth, formatOrder, setCors } = require('../../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    const db = await getDb();

    if (req.method === 'POST') {
      const body = req.body || {};
      const medRes = await db.execute({ sql: 'SELECT * FROM medicines WHERE id = ?', args: [body.medicineId] });
      const pharmRes = await db.execute({ sql: 'SELECT * FROM pharmacies WHERE id = ?', args: [body.pharmacyId] });
      const priceRes = await db.execute({ sql: 'SELECT price FROM prices WHERE medicine_id = ? AND pharmacy_id = ?', args: [body.medicineId, body.pharmacyId] });
      const medicine = medRes.rows[0], pharmacy = pharmRes.rows[0], priceRow = priceRes.rows[0];
      if (!medicine || !pharmacy || !priceRow) return res.status(400).json({ error: 'Remédio ou farmácia inválidos.' });

      const pointsValue = Math.max(5, Math.round(priceRow.price));
      const pickupCode = String(Math.floor(100000 + Math.random() * 899999));
      const insert = await db.execute({
        sql: 'INSERT INTO orders (user_id, medicine_id, pharmacy_id, price, points_value, pickup_code) VALUES (?,?,?,?,?,?)',
        args: [user.id, medicine.id, pharmacy.id, priceRow.price, pointsValue, pickupCode],
      });
      const orderRow = await db.execute({
        sql: `SELECT o.*, m.name as med_name, ph.name as pharm_name FROM orders o
              JOIN medicines m ON m.id=o.medicine_id JOIN pharmacies ph ON ph.id=o.pharmacy_id WHERE o.id = ?`,
        args: [Number(insert.lastInsertRowid)],
      });
      return res.status(201).json({ order: formatOrder(orderRow.rows[0]) });
    }

    if (req.method === 'GET') {
      const rows = await db.execute({
        sql: `SELECT o.*, m.name as med_name, ph.name as pharm_name
              FROM orders o JOIN medicines m ON m.id=o.medicine_id JOIN pharmacies ph ON ph.id=o.pharmacy_id
              WHERE o.user_id = ? ORDER BY o.created_at DESC`,
        args: [user.id],
      });
      return res.status(200).json({ orders: rows.rows.map(formatOrder) });
    }

    res.status(405).json({ error: 'Método não permitido.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erro interno do servidor.' });
  }
};
