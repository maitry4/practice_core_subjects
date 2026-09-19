/* home.js — populates stats on the home page */

const CATEGORIES = ['DBMS', 'SQL', 'OOPs', 'CN', 'OS', 'HLD'];

document.addEventListener('DOMContentLoaded', async () => {
  const counts = await getCounts();
  const grid = document.getElementById('stats-grid');

  CATEGORIES.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'stat-chip';
    chip.innerHTML = `
      <div class="stat-chip__name">${cat}</div>
      <div class="stat-chip__count">${counts[cat] || 0}</div>
    `;
    grid.appendChild(chip);
  });
});
