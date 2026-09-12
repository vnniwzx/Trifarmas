// lib/db.js
// Camada de banco de dados do Trifarmas na Vercel.
//
// Em produção, usa o Turso (banco compatível com SQLite, feito sob medida
// para funções serverless — veja o README para criar o seu gratuitamente).
//
// Para eu conseguir TESTAR esse backend aqui no meu ambiente (sem acesso a
// internet para criar um Turso de verdade), essa camada tem um modo local
// que usa o node:sqlite nativo por trás de uma interface idêntica à do
// cliente do Turso. Isso significa que toda a LÓGICA das rotas (as
// consultas SQL, as regras de negócio) foi testada de verdade — só a
// conexão final com o Turso em si não pôde ser testada por mim.
//
// Para rodar em modo de teste local: defina a variável de ambiente
// LOCAL_TEST_DB=1 antes de iniciar. Isso NUNCA deve ser usado em produção.

const fs = require('node:fs');
const path = require('node:path');

let clientPromise = null;
let schemaReady = false;

function wrapNodeSqliteAsLibsql() {
  const { DatabaseSync } = require('node:sqlite');
  const dbFile = path.join(process.env.LOCAL_TEST_DB_PATH || '/tmp', 'trifarmas-local-test.sqlite');
  const raw = new DatabaseSync(dbFile);
  raw.exec('PRAGMA foreign_keys = ON;');

  function normalize(query) {
    return typeof query === 'string' ? { sql: query, args: [] } : { sql: query.sql, args: query.args || [] };
  }

  return {
    async execute(query) {
      const { sql, args } = normalize(query);
      const trimmed = sql.trim().toUpperCase();
      const stmt = raw.prepare(sql);
      if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA')) {
        const rows = stmt.all(...args);
        return { rows, columns: rows.length ? Object.keys(rows[0]) : [], rowsAffected: 0 };
      }
      const info = stmt.run(...args);
      return { rows: [], columns: [], rowsAffected: info.changes, lastInsertRowid: info.lastInsertRowid };
    },
    async executeMultiple(sql) {
      raw.exec(sql);
    },
    async batch(queries) {
      const results = [];
      for (const q of queries) results.push(await this.execute(q));
      return results;
    },
  };
}

async function createRealClient() {
  const { createClient } = require('@libsql/client');
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error(
      'Faltam as variáveis de ambiente TURSO_DATABASE_URL e/ou TURSO_AUTH_TOKEN. ' +
      'Configure-as no painel da Vercel (Settings → Environment Variables). Veja o README.'
    );
  }
  return createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

async function seed(client) {
  const pharmacies = [
    { name: 'Farmácia Vida Verde', dist_km: 0.4, map_x: 330, map_y: 330 },
    { name: 'Drogaria São Lucas', dist_km: 0.7, map_x: 560, map_y: 270 },
    { name: 'Farmácia Popular Central', dist_km: 0.9, map_x: 620, map_y: 480 },
    { name: 'Drogaria Bem-Estar', dist_km: 1.3, map_x: 290, map_y: 420 },
    { name: 'Farmácia do Bairro', dist_km: 1.6, map_x: 640, map_y: 620 },
    { name: 'Drogaria Saúde+', dist_km: 2.1, map_x: 400, map_y: 660 },
  ];
  const pharmIds = [];
  for (const p of pharmacies) {
    const r = await client.execute({
      sql: 'INSERT INTO pharmacies (name, dist_km, map_x, map_y) VALUES (?,?,?,?)',
      args: [p.name, p.dist_km, p.map_x, p.map_y],
    });
    pharmIds.push(Number(r.lastInsertRowid));
  }

  const medicines = [
    { name: 'Dipirona Sódica 500mg', cat: 'Analgésico', prices: [9.90, 14.50, 11.20, 18.00, 10.40, 13.30] },
    { name: 'Paracetamol 750mg', cat: 'Analgésico', prices: [7.50, 8.90, 12.00, 7.10, 9.90, 6.80] },
    { name: 'Amoxicilina 500mg', cat: 'Antibiótico', prices: [22.00, 19.90, 31.50, 24.00, 18.40, 20.10] },
    { name: 'Losartana Potássica 50mg', cat: 'Cardiovascular', prices: [15.90, 12.40, 29.90, 14.00, 13.20, 16.70] },
    { name: 'Omeprazol 20mg', cat: 'Gastro', prices: [11.30, 9.80, 17.60, 10.90, 8.70, 12.10] },
    { name: 'Ibuprofeno 400mg', cat: 'Analgésico', prices: [13.40, 11.90, 19.00, 12.30, 14.60, 10.50] },
    { name: 'Loratadina 10mg', cat: 'Alergia', prices: [8.20, 7.40, 13.90, 9.10, 6.90, 8.60] },
    { name: 'Metformina 850mg', cat: 'Diabetes', prices: [16.50, 21.90, 14.20, 19.00, 15.80, 17.30] },
  ];
  for (const m of medicines) {
    const r = await client.execute({ sql: 'INSERT INTO medicines (name, category) VALUES (?,?)', args: [m.name, m.cat] });
    const medId = Number(r.lastInsertRowid);
    for (let i = 0; i < m.prices.length; i++) {
      await client.execute({
        sql: 'INSERT INTO prices (medicine_id, pharmacy_id, price) VALUES (?,?,?)',
        args: [medId, pharmIds[i], m.prices[i]],
      });
    }
  }

  const rewards = [
    { name: 'R$5 de desconto', description: 'Em qualquer analgésico', cost: 100 },
    { name: 'R$10 de desconto', description: 'Em qualquer antibiótico', cost: 200 },
    { name: '15% off', description: 'Em produtos de dermocosmética', cost: 280 },
    { name: 'Frete grátis', description: 'Na retirada expressa', cost: 80 },
    { name: 'R$20 de desconto', description: 'Em compras acima de R$100', cost: 400 },
  ];
  for (const r of rewards) {
    await client.execute({ sql: 'INSERT INTO rewards (name, description, cost) VALUES (?,?,?)', args: [r.name, r.description, r.cost] });
  }
}

async function ensureSchema(client) {
  if (schemaReady) return;
  const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await client.executeMultiple(schemaSql);

  const check = await client.execute('SELECT COUNT(*) as c FROM pharmacies');
  const count = Number(check.rows[0].c);
  if (count === 0) await seed(client);

  schemaReady = true;
}

async function getDb() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = process.env.LOCAL_TEST_DB ? wrapNodeSqliteAsLibsql() : await createRealClient();
      await ensureSchema(client);
      return client;
    })();
  }
  return clientPromise;
}

module.exports = { getDb };
