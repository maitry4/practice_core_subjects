/* home.js — populates stats on the home page */

const CATEGORIES = ['DBMS', 'SQL', 'OOPs', 'CN', 'OS', 'HLD'];

async function renderStats() {
  const counts = await getCounts();
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = '';

  CATEGORIES.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'stat-chip';
    chip.innerHTML = `
      <div class="stat-chip__name">${cat}</div>
      <div class="stat-chip__count">${counts[cat] || 0}</div>
    `;
    grid.appendChild(chip);
  });

  const statusEl = document.getElementById('db-status');
  if (_fileHandle) statusEl.textContent = `Connected: ${_fileHandle.name}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  await renderStats();

  document.getElementById('change-db-btn').addEventListener('click', async () => {
    try {
      await reconnectDatabaseFile();
      showToast('Database file connected');
      await renderStats();
    } catch (err) {
      console.error(err);
      showToast('Could not connect to file', true);
    }
  });
});
