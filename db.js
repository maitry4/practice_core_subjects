/* db.js — shared SQLite module using sql.js (loaded from CDN),
   backed by a real db.sqlite file on disk via the File System Access API. */

const HANDLE_DB_NAME = 'flashcards-fs';
const HANDLE_STORE = 'handles';
const HANDLE_KEY = 'dbFile';

let _fileHandle = null;
let _dbReady = null;
let _db = null;

/* ---------- IndexedDB helpers (remember the picked file across reloads) ---------- */

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HANDLE_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(HANDLE_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const dbConn = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = dbConn.transaction(HANDLE_STORE, 'readonly');
    const req = tx.objectStore(HANDLE_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const dbConn = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = dbConn.transaction(HANDLE_STORE, 'readwrite');
    tx.objectStore(HANDLE_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------- File handle acquisition ---------- */

async function verifyPermission(handle, readWrite) {
  const opts = readWrite ? { mode: 'readwrite' } : {};
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  if ((await handle.requestPermission(opts)) === 'granted') return true;
  return false;
}

/** Opens a native file picker to select an existing db.sqlite or create a new one. */
async function pickDatabaseFile(createNew) {
  if (!('showOpenFilePicker' in window)) {
    throw new Error('File System Access API not supported in this browser. Use Chrome or Edge.');
  }
  const types = [{
    description: 'SQLite Database',
    accept: { 'application/x-sqlite3': ['.sqlite', '.db'] }
  }];

  let handle;
  if (createNew) {
    handle = await window.showSaveFilePicker({ suggestedName: 'db.sqlite', types });
  } else {
    [handle] = await window.showOpenFilePicker({ types });
  }

  const ok = await verifyPermission(handle, true);
  if (!ok) throw new Error('Permission to read/write the file was denied.');

  _fileHandle = handle;
  await idbSet(HANDLE_KEY, handle);
  return handle;
}

/** Tries to silently reuse a previously-picked file handle (no dialog) if permission still holds. */
async function tryRestoreHandle() {
  try {
    const stored = await idbGet(HANDLE_KEY);
    if (stored && (await verifyPermission(stored, true))) {
      _fileHandle = stored;
      return true;
    }
  } catch (e) {
    // IndexedDB unavailable or handle stale — fall through to manual connect
  }
  return false;
}

/** Blocks (via an injected overlay) until the user has picked/created db.sqlite. */
function waitForManualConnect() {
  return new Promise((resolve, reject) => {
    const overlay = document.createElement('div');
    overlay.className = 'db-connect-overlay';
    overlay.innerHTML = `
      <div class="db-connect-box">
        <h2>Connect your database</h2>
        <p>Choose an existing <code>db.sqlite</code> file, or create a new one in this app's folder.</p>
        <div class="db-connect-actions">
          <button class="btn btn--primary" id="db-connect-open">Open existing db.sqlite</button>
          <button class="btn btn--outline" id="db-connect-create">Create new db.sqlite</button>
        </div>
        <p class="db-connect-error" id="db-connect-error"></p>
      </div>
    `;
    document.body.appendChild(overlay);

    const errorEl = overlay.querySelector('#db-connect-error');
    const handleClick = (createNew) => async () => {
      errorEl.textContent = '';
      try {
        await pickDatabaseFile(createNew);
        overlay.remove();
        resolve();
      } catch (err) {
        errorEl.textContent = err.message || 'Could not open the file.';
      }
    };

    overlay.querySelector('#db-connect-open').addEventListener('click', handleClick(false));
    overlay.querySelector('#db-connect-create').addEventListener('click', handleClick(true));
  });
}

async function ensureFileHandle() {
  if (_fileHandle) return _fileHandle;
  if (await tryRestoreHandle()) return _fileHandle;
  await waitForManualConnect();
  return _fileHandle;
}

/** Lets the UI (e.g. a "Change database file" button) force a re-pick. */
async function reconnectDatabaseFile() {
  _fileHandle = null;
  _dbReady = null;
  _db = null;
  await waitForManualConnect();
  return getDB();
}

/* ---------- Core DB lifecycle ---------- */

/**
 * Initializes (or loads) the SQLite database from the connected db.sqlite file.
 * Returns a promise that resolves with the db instance.
 */
function getDB() {
  if (_dbReady) return _dbReady;

  _dbReady = (async () => {
    await ensureFileHandle();

    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });

    const file = await _fileHandle.getFile();
    const buf = new Uint8Array(await file.arrayBuffer());

    const db = buf.length > 0 ? new SQL.Database(buf) : new SQL.Database();

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

    _db = db;
    await saveDB(db);
    return db;
  })();

  return _dbReady;
}

/** Persist the database straight to db.sqlite on disk. */
async function saveDB(db) {
  const data = db.export();
  const writable = await _fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

/** Add a card */
async function addCard(category, subcategory, question, answer) {
  const db = await getDB();
  db.run(
    'INSERT INTO cards (category, subcategory, question, answer) VALUES (?, ?, ?, ?)',
    [category, subcategory, question, answer]
  );
  await saveDB(db);
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
  await saveDB(db);
}

/** Show toast notification */
function showToast(message, isError) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => { toast.className = 'toast'; }, 2200);
}
