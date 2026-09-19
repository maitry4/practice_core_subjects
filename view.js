/* view.js — handles card viewing, flipping, swiping */

let cards = [];
let currentIndex = 0;

const flashcard = document.getElementById('flashcard');
const inner = document.getElementById('flashcard-inner');
const questionEl = document.getElementById('card-question');
const answerEl = document.getElementById('card-answer');
const badgeEl = document.getElementById('card-badge');
const counterEl = document.getElementById('card-counter');
const controls = document.getElementById('controls');

const catSelect = document.getElementById('view-category');
const subSelect = document.getElementById('view-subcategory');

// ---- Load & Display ----

async function loadCards() {
  const cat = catSelect.value;
  const sub = subSelect.value;
  cards = await getCards(cat, sub);
  currentIndex = 0;
  renderCard();
}

function renderCard() {
  // un-flip
  inner.classList.remove('flipped');

  if (cards.length === 0) {
    questionEl.innerHTML = 'No cards here yet. Go add some!';
    answerEl.innerHTML = '';
    badgeEl.textContent = '';
    counterEl.textContent = 'No cards found';
    controls.style.display = 'none';
    return;
  }

  controls.style.display = 'flex';
  const card = cards[currentIndex];
  questionEl.innerHTML = card.question;
  answerEl.innerHTML = card.answer;
  badgeEl.textContent = `${card.category} · ${card.subcategory}`;
  counterEl.textContent = `${currentIndex + 1} / ${cards.length}`;
}

// ---- Flip ----

flashcard.addEventListener('click', () => {
  inner.classList.toggle('flipped');
});

// ---- Prev / Next ----

document.getElementById('prev-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  if (cards.length === 0) return;
  swipeAnimate('swipe-right', () => {
    currentIndex = (currentIndex - 1 + cards.length) % cards.length;
    renderCard();
  });
});

document.getElementById('next-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  if (cards.length === 0) return;
  swipeAnimate('swipe-left', () => {
    currentIndex = (currentIndex + 1) % cards.length;
    renderCard();
  });
});

function swipeAnimate(className, cb) {
  flashcard.classList.add(className);
  flashcard.addEventListener('animationend', function handler() {
    flashcard.removeEventListener('animationend', handler);
    flashcard.classList.remove(className);
    cb();
  });
}

// ---- Delete ----

document.getElementById('delete-btn').addEventListener('click', async (e) => {
  e.stopPropagation();
  if (cards.length === 0) return;
  if (!confirm('Delete this card?')) return;
  await deleteCard(cards[currentIndex].id);
  showToast('Card deleted');
  await loadCards();
});

// ---- Read Aloud ----

const speakBtn = document.getElementById('speak-btn');
let isSpeaking = false;

speakBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (cards.length === 0) return;

  if (isSpeaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    speakBtn.textContent = '🔊';
    return;
  }

  // Strip HTML tags to get plain text
  const temp = document.createElement('div');
  temp.innerHTML = cards[currentIndex].answer;
  const plainText = temp.textContent || temp.innerText || '';

  if (!plainText.trim()) return;

  const utterance = new SpeechSynthesisUtterance(plainText);
  utterance.rate = 2;
  utterance.pitch = 1;

  utterance.onstart = () => {
    isSpeaking = true;
    speakBtn.textContent = '⏹️';
  };

  utterance.onend = () => {
    isSpeaking = false;
    speakBtn.textContent = '🔊';
  };

  utterance.onerror = () => {
    isSpeaking = false;
    speakBtn.textContent = '🔊';
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
});

// ---- Touch Swipe ----

let touchStartX = 0;
let touchStartY = 0;

flashcard.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

flashcard.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].screenX - touchStartX;
  const dy = e.changedTouches[0].screenY - touchStartY;
  if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
  if (dx < 0) {
    if (cards.length === 0) return;
    swipeAnimate('swipe-left', () => {
      currentIndex = (currentIndex + 1) % cards.length;
      renderCard();
    });
  } else {
    if (cards.length === 0) return;
    swipeAnimate('swipe-right', () => {
      currentIndex = (currentIndex - 1 + cards.length) % cards.length;
      renderCard();
    });
  }
}, { passive: true });

// ---- Keyboard shortcuts ----

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') document.getElementById('prev-btn').click();
  if (e.key === 'ArrowRight') document.getElementById('next-btn').click();
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flashcard.click(); }
});

// ---- Filter change ----

catSelect.addEventListener('change', loadCards);
subSelect.addEventListener('change', loadCards);

// ---- Init ----

document.addEventListener('DOMContentLoaded', loadCards);
