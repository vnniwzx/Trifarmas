const { getDb } = require('../../lib/db');
const { requireAuth, setCors } = require('../../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    const db = await getDb();

    if (req.method === 'GET') {
      const rows = await db.execute({
        sql: 'SELECT * FROM reminders WHERE user_id = ? ORDER BY year, month, day, time',
        args: [user.id],
      });
      return res.status(200).json({ reminders: rows.rows });
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.medName || !b.time || b.day == null || b.month == null || b.year == null) {
        return res.status(400).json({ error: 'Dados incompletos para o lembrete.' });
      }
      const insert = await db.execute({
        sql: 'INSERT INTO reminders (user_id, med_name, time, day, month, year) VALUES (?,?,?,?,?,?)',
        args: [user.id, b.medName, b.time, b.day, b.month, b.year],
      });
      const reminder = await db.execute({ sql: 'SELECT * FROM reminders WHERE id = ?', args: [Number(insert.lastInsertRowid)] });
      return res.status(201).json({ reminder: reminder.rows[0] });
    }

    res.status(405).json({ error: 'Método não permitido.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erro interno do servidor.' });
  }
};
