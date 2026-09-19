/* db.js — shared SQLite module using sql.js (loaded from CDN) */

const DB_KEY = 'flashcards_db';

let _dbReady;

/**
 * Initializes (or loads) the SQLite database.
 * Returns a promise that resolves with the db instance.
 */
function getDB() {
  if (_dbReady) return _dbReady;

  _dbReady = initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  }).then(SQL => {
    let db;
    const saved = localStorage.getItem(DB_KEY);
    if (saved) {
      const buf = Uint8Array.from(atob(saved), c => c.charCodeAt(0));
      db = new SQL.Database(buf);
    } else {
      db = new SQL.Database();
    }

    // Create table if not exists
    db.run(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        subcategory TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    saveDB(db);
    return db;
  });

  return _dbReady;
}

/** Persist the database to localStorage */
function saveDB(db) {
  const data = db.export();
  const base64 = btoa(String.fromCharCode(...data));
  localStorage.setItem(DB_KEY, base64);
}

/** Add a card */
async function addCard(category, subcategory, question, answer) {
  const db = await getDB();
  db.run(
    'INSERT INTO cards (category, subcategory, question, answer) VALUES (?, ?, ?, ?)',
    [category, subcategory, question, answer]
  );
  saveDB(db);
}

/** Get cards with optional filters */
async function getCards(category, subcategory) {
  const db = await getDB();
  let sql = 'SELECT * FROM cards WHERE 1=1';
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (subcategory) { sql += ' AND subcategory = ?'; params.push(subcategory); }
  sql += ' ORDER BY id ASC';
  const result = db.exec(sql, params);
  if (!result.length) return [];
  return result[0].values.map(row => ({
    id: row[0],
    category: row[1],
    subcategory: row[2],
    question: row[3],
    answer: row[4],
    created_at: row[5]
  }));
}

/** Count cards per category */
async function getCounts() {
  const db = await getDB();
  const result = db.exec('SELECT category, COUNT(*) as cnt FROM cards GROUP BY category');
  if (!result.length) return {};
  const counts = {};
  result[0].values.forEach(row => { counts[row[0]] = row[1]; });
  return counts;
}

/** Delete a card by id */
async function deleteCard(id) {
  const db = await getDB();
  db.run('DELETE FROM cards WHERE id = ?', [id]);
  saveDB(db);
}

/** Show toast notification */
function showToast(message, isError) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => { toast.className = 'toast'; }, 2200);
}
