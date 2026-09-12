const { getDb } = require('../lib/db');
const { setCors } = require('../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const db = await getDb();
    const search = String(req.query.search || '').toLowerCase().trim();
    const category = String(req.query.category || '');

    const allMeds = (await db.execute('SELECT * FROM medicines')).rows;
    let meds = allMeds;
    if (category && category !== 'Todos') meds = meds.filter(m => m.category === category);
    if (search) meds = meds.filter(m => m.name.toLowerCase().includes(search));

    const result = [];
    for (const m of meds) {
      const prices = await db.execute({
        sql: `SELECT pr.price, ph.id as pharmacy_id, ph.name as pharmacy_name, ph.dist_km
              FROM prices pr JOIN pharmacies ph ON ph.id = pr.pharmacy_id
              WHERE pr.medicine_id = ? ORDER BY pr.price ASC`,
        args: [m.id],
      });
      result.push({
        id: Number(m.id), name: m.name, category: m.category,
        prices: prices.rows.map(p => ({ price: p.price, pharmacy_id: Number(p.pharmacy_id), pharmacy_name: p.pharmacy_name, dist_km: p.dist_km })),
      });
    }

    const categories = [...new Set(allMeds.map(m => m.category))];
    res.status(200).json({ medicines: result, categories });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erro interno do servidor.' });
  }
};
