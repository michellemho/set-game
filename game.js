const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const deckEl = document.getElementById('deck-remaining');
const msgBar = document.getElementById('message-bar');
const gameOverOverlay = document.getElementById('game-over-overlay');
const finalScoreEl = document.getElementById('final-score');

document.getElementById('new-game-btn').addEventListener('click', startNewGame);
document.getElementById('play-again-btn').addEventListener('click', startNewGame);

let selectedIndices = [];
let currentBoard = [];

async function startNewGame() {
  selectedIndices = [];
  gameOverOverlay.classList.add('hidden');
  hideMessage();
  const res = await fetch('/api/new_game', { method: 'POST' });
  const data = await res.json();
  updateState(data);
}

async function submitSet() {
  const res = await fetch('/api/submit_set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ indices: selectedIndices })
  });
  const data = await res.json();

  if (data.valid) {
    showMessage('Set! +1', 'success');
    selectedIndices = [];
    updateState(data);
  } else {
    showMessage(data.message || 'Not a Set!', 'error');
    selectedIndices = [];
    renderBoard(currentBoard); // re-render to deselect
  }
}

function updateState(data) {
  currentBoard = data.board;
  scoreEl.textContent = data.score;
  deckEl.textContent = data.deck_remaining;
  renderBoard(currentBoard);
  if (data.game_over) {
    finalScoreEl.textContent = data.score;
    gameOverOverlay.classList.remove('hidden');
  }
}

function cardKey(card) {
  return `${card.number}-${card.color}-${card.shape}-${card.shading}`;
}

function renderBoard(board) {
  const existingCards = boardEl.children;

  if (existingCards.length !== board.length) {
    // Board size changed — full re-render
    boardEl.innerHTML = '';
    board.forEach((card, idx) => boardEl.appendChild(createCardEl(card, idx)));
    return;
  }

  // Diff-based update: only replace cards that changed
  board.forEach((card, idx) => {
    const existing = existingCards[idx];
    if (existing && existing.dataset.key === cardKey(card)) {
      // Same card — just sync selected state
      existing.className = 'card' + (selectedIndices.includes(idx) ? ' selected' : '');
    } else {
      // New card at this position — replace the element
      boardEl.replaceChild(createCardEl(card, idx), existing);
    }
  });
}

function createCardEl(card, idx) {
  const div = document.createElement('div');
  div.className = 'card' + (selectedIndices.includes(idx) ? ' selected' : '');
  div.dataset.key = cardKey(card);
  div.addEventListener('click', () => onCardClick(idx));

  for (let i = 0; i < card.number; i++) {
    const svg = makeShapeSVG(card);
    div.appendChild(svg);
  }

  return div;
}

function onCardClick(idx) {
  if (selectedIndices.includes(idx)) {
    selectedIndices = selectedIndices.filter(i => i !== idx);
    renderBoard(currentBoard);
    return;
  }
  if (selectedIndices.length >= 3) return;
  selectedIndices.push(idx);
  renderBoard(currentBoard);

  if (selectedIndices.length === 3) {
    submitSet();
  }
}

function makeShapeSVG(card) {
  const ns = 'http://www.w3.org/2000/svg';
  const svgEl = document.createElementNS(ns, 'svg');
  svgEl.setAttribute('viewBox', '0 0 56 28');
  svgEl.setAttribute('class', 'shape' + (card.shape === 'squiggle' ? ' squiggle' : ''));

  // Stripe pattern def
  const defs = document.createElementNS(ns, 'defs');
  const patternId = `stripe-${card.color}-${Math.random().toString(36).slice(2)}`;
  const pattern = document.createElementNS(ns, 'pattern');
  pattern.setAttribute('id', patternId);
  pattern.setAttribute('patternUnits', 'userSpaceOnUse');
  pattern.setAttribute('width', '4');
  pattern.setAttribute('height', '4');
  const line = document.createElementNS(ns, 'line');
  line.setAttribute('x1', '0'); line.setAttribute('y1', '0');
  line.setAttribute('x2', '0'); line.setAttribute('y2', '4');
  line.setAttribute('stroke', colorHex(card.color));
  line.setAttribute('stroke-width', '1.5');
  pattern.appendChild(line);
  defs.appendChild(pattern);
  svgEl.appendChild(defs);

  const shape = document.createElementNS(ns, card.shape === 'diamond' ? 'polygon' : (card.shape === 'oval' ? 'ellipse' : 'path'));

  const colorH = colorHex(card.color);
  let fillVal;
  if (card.shading === 'solid') fillVal = colorH;
  else if (card.shading === 'open') fillVal = 'none';
  else fillVal = `url(#${patternId})`;

  shape.setAttribute('stroke', colorH);
  shape.setAttribute('stroke-width', '2.5');
  shape.setAttribute('fill', fillVal);

  if (card.shape === 'oval') {
    shape.setAttribute('cx', '28');
    shape.setAttribute('cy', '14');
    shape.setAttribute('rx', '22');
    shape.setAttribute('ry', '11');
  } else if (card.shape === 'diamond') {
    shape.setAttribute('points', '28,2 54,14 28,26 2,14');
  } else {
    // squiggle — S-wave shape (rotated 90° by CSS to appear as S)
    shape.setAttribute('d', 'M52,2.5 C56,13.5 44,25.5 30,22 C25,21 19.5,16 11.5,21.5 C2.5,28 0,24 0,15 C0,6 7.5,0 16,1 C28,2.5 30,11 44,2 C47,0 50,0 52,2.5 Z');
  }

  svgEl.appendChild(shape);
  return svgEl;
}

function colorHex(color) {
  return { red: '#e03030', green: '#2a9a2a', purple: '#7b30c8' }[color];
}

function showMessage(msg, type) {
  msgBar.textContent = msg;
  msgBar.className = type;
  clearTimeout(msgBar._timeout);
  msgBar._timeout = setTimeout(hideMessage, 2000);
}

function hideMessage() {
  msgBar.className = 'hidden';
}

// Auto-start on load
startNewGame();
