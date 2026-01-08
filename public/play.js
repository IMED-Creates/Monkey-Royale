// Basic config
const START_BANANAS = 5;
const MAX_BANANAS = 10;
const BANANA_TICK_MS = 1500;
const BANANA_PER_TICK = 1;

const PLAYER_BASE_MAX_HP = 100;
const ENEMY_BASE_MAX_HP = 100;

const UNIT_SPEED = 0.4; // px per frame
const ATTACK_RANGE = 60; // px
const ATTACK_DAMAGE = 5;
const ATTACK_COOLDOWN_MS = 800;

// Simple cost mapping (by name substring)
const DEFAULT_COST = 3;
const COST_BY_TYPE = [
  { key: "DartMonkey", cost: 2 },
  { key: "BoomerangMonkey", cost: 3 },
  { key: "BombShooter", cost: 4 },
  { key: "SniperMonkey", cost: 4 },
  { key: "SuperMonkey", cost: 6 },
  { key: "NinjaMonkey", cost: 3 },
  { key: "Alchemist", cost: 4 },
  { key: "Druid", cost: 3 },
  { key: "BananaFarm", cost: 5 }
];

// State
let bananas = START_BANANAS;
let playerBaseHp = PLAYER_BASE_MAX_HP;
let enemyBaseHp = ENEMY_BASE_MAX_HP;

let units = []; // {id, side, lane, x, y, el, lastAttackTime}
let nextUnitId = 1;

let lastFrameTime = performance.now();
let gameOver = false;

// DOM
const bananaCountEl = document.getElementById("banana-count");
const playerBaseHpEl = document.getElementById("player-base-hp");
const enemyBaseHpEl = document.getElementById("enemy-base-hp");
const handEl = document.getElementById("hand");
const messageEl = document.getElementById("message");
const backBtn = document.getElementById("back-btn");

const laneFields = {
  top: document.querySelector('.lane-field[data-lane="top"]'),
  bottom: document.querySelector('.lane-field[data-lane="bottom"]')
};

const enemyTowers = {
  top: document.querySelector('.enemy-tower[data-lane="top"]'),
  bottom: document.querySelector('.enemy-tower[data-lane="bottom"]')
};

const playerTowers = {
  top: document.querySelector('.player-tower[data-lane="top"]'),
  bottom: document.querySelector('.player-tower[data-lane="bottom"]')
};

// Helpers
function showMessage(text, duration = 1500) {
  messageEl.textContent = text;
  messageEl.classList.remove("hidden");
  setTimeout(() => {
    messageEl.classList.add("hidden");
  }, duration);
}

function updateHUD() {
  bananaCountEl.textContent = bananas;
  playerBaseHpEl.textContent = playerBaseHp;
  enemyBaseHpEl.textContent = enemyBaseHp;
}

function getCostForCard(filename) {
  for (const entry of COST_BY_TYPE) {
    if (filename.includes(entry.key)) return entry.cost;
  }
  return DEFAULT_COST;
}

function formatNameFromFilename(filename) {
  const base = filename.replace("BTD6_000-", "").replace(".png", "");
  return base.replace(/([A-Z])/g, " $1").trim();
}

// Load loadout from localStorage (from cards screen)
function loadLoadout() {
  try {
    const raw = localStorage.getItem("loadout");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(Boolean);
  } catch (e) {
    console.error("Failed to load loadout:", e);
    return [];
  }
}

// Render hand
function renderHand() {
  const loadout = loadLoadout();
  handEl.innerHTML = "";

  if (!loadout.length) {
    const msg = document.createElement("div");
    msg.style.color = "#9ca3af";
    msg.style.fontSize = "13px";
    msg.textContent = "No loadout selected. Go back to Cards and pick some.";
    handEl.appendChild(msg);
    return;
  }

  loadout.forEach((filename, index) => {
    const card = document.createElement("div");
    card.className = "card";
    const img = document.createElement("img");
    img.src = `images/${filename}`;
    img.alt = filename;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = formatNameFromFilename(filename);

    const cost = getCostForCard(filename);
    const costSpan = document.createElement("span");
    costSpan.className = "cost";
    costSpan.textContent = `${cost} 🍌`;

    card.appendChild(img);
    card.appendChild(nameSpan);
    card.appendChild(costSpan);

    card.addEventListener("click", () => {
      if (gameOver) return;
      spawnFromCard(filename, cost);
    });

    handEl.appendChild(card);
  });
}

// Spawn logic
function spawnFromCard(filename, cost) {
  if (bananas < cost) {
    showMessage("Not enough bananas!");
    return;
  }

  // Ask which lane: top or bottom
  const lane = Math.random() < 0.5 ? "top" : "bottom"; // simple auto lane
  // If you want manual lane selection later, we can add UI.

  bananas -= cost;
  updateHUD();

  spawnUnit("player", lane, filename);
}

// Create unit element
function createUnitElement(side, lane, filename) {
  const el = document.createElement("div");
  el.classList.add("unit", side);
  el.textContent = side === "player" ? "🐵" : "🎈";
  laneFields[lane].appendChild(el);
  return el;
}

// Spawn unit
function spawnUnit(side, lane, filename = null) {
  const field = laneFields[lane];
  const rect = field.getBoundingClientRect();

  const id = nextUnitId++;
  const el = createUnitElement(side, lane, filename);

  const x = side === "player" ? 10 : rect.width - 50;
  const y = rect.height / 2 - 20;

  el.style.transform = `translate(${x}px, ${y}px)`;

  units.push({
    id,
    side,
    lane,
    x,
    y,
    el,
    lastAttackTime: 0
  });
}

// Enemy AI: periodically spawn units
function startEnemyAI() {
  setInterval(() => {
    if (gameOver) return;
    const lane = Math.random() < 0.5 ? "top" : "bottom";
    spawnUnit("enemy", lane);
  }, 2500);
}

// Banana generation
function startBananaTick() {
  setInterval(() => {
    if (gameOver) return;
    if (bananas < MAX_BANANAS) {
      bananas = Math.min(MAX_BANANAS, bananas + BANANA_PER_TICK);
      updateHUD();
    }
  }, BANANA_TICK_MS);
}

// Distance helper
function distance(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// Game loop
function update(deltaMs) {
  if (gameOver) return;

  const now = performance.now();

  // Move units
  units.forEach(u => {
    const field = laneFields[u.lane];
    const rect = field.getBoundingClientRect();

    if (u.side === "player") {
      u.x += UNIT_SPEED * deltaMs;
      if (u.x > rect.width - 60) {
        // Hit enemy base
        enemyBaseHp = Math.max(0, enemyBaseHp - ATTACK_DAMAGE);
        updateHUD();
        if (enemyBaseHp <= 0) {
          endGame(true);
        }
        u.x = rect.width - 60;
      }
    } else {
      u.x -= UNIT_SPEED * deltaMs;
      if (u.x < 10) {
        // Hit player base
        playerBaseHp = Math.max(0, playerBaseHp - ATTACK_DAMAGE);
        updateHUD();
        if (playerBaseHp <= 0) {
          endGame(false);
        }
        u.x = 10;
      }
    }

    u.el.style.transform = `translate(${u.x}px, ${u.y}px)`;
  });

  // Combat
  for (let i = 0; i < units.length; i++) {
    const a = units[i];
    if (!a) continue;

    const now = performance.now();
    if (now - a.lastAttackTime < ATTACK_COOLDOWN_MS) continue;

    // Find nearest enemy in same lane
    let target = null;
    let bestDist = Infinity;

    for (let j = 0; j < units.length; j++) {
      if (i === j) continue;
      const b = units[j];
      if (!b) continue;
      if (b.lane !== a.lane) continue;
      if (b.side === a.side) continue;

      const d = distance(a.x, a.y, b.x, b.y);
      if (d < bestDist && d <= ATTACK_RANGE) {
        bestDist = d;
        target = b;
      }
    }

    if (target) {
      a.lastAttackTime = now;
      // Simple: remove target
      target.el.remove();
      units = units.filter(u => u.id !== target.id);
    }
  }
}

function loop(timestamp) {
  const delta = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  update(delta);
  requestAnimationFrame(loop);
}

function endGame(playerWon) {
  gameOver = true;
  showMessage(playerWon ? "You win! 🎉" : "You lose! 💀", 4000);
}

// Back button
backBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

// Init
function init() {
  bananas = START_BANANAS;
  playerBaseHp = PLAYER_BASE_MAX_HP;
  enemyBaseHp = ENEMY_BASE_MAX_HP;
  updateHUD();
  renderHand();
  startBananaTick();
  startEnemyAI();
  requestAnimationFrame(loop);
}

init();
