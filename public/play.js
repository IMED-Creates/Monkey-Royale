// ==============================
// Monkey Royale - play.js
// Section 1/5: Core setup, arena, towers, units, decks, UI
// ==============================

// ---- DOM refs ----
const arenaEl = document.getElementById("arena");
const unitLayerEl = document.getElementById("unit-layer");
const placementCircleEl = document.getElementById("placement-circle");
const ghostUnitEl = document.getElementById("ghost-unit");
const cardHandEl = document.getElementById("card-hand");
const elixirFillEl = document.getElementById("elixir-fill");
const elixirCountEl = document.getElementById("elixir-count");
const timerEl = document.getElementById("match-timer");
const playerCrownsEl = document.getElementById("player-crowns");
const enemyCrownsEl = document.getElementById("enemy-crowns");

const playerLeftTowerEl = document.getElementById("player-left-tower");
const playerRightTowerEl = document.getElementById("player-right-tower");
const playerKingEl = document.getElementById("player-king-tower");
const enemyLeftTowerEl = document.getElementById("enemy-left-tower");
const enemyRightTowerEl = document.getElementById("enemy-right-tower");
const enemyKingEl = document.getElementById("enemy-king-tower");

// ---- Game constants ----
const GAME_DURATION_SECONDS = 180; // 3:00
const TICK_RATE = 1000 / 60; // 60 FPS

const ARENA_SIDE_PLAYER = "player";
const ARENA_SIDE_ENEMY = "enemy";

const TOWER_TYPE_KING = "king";
const TOWER_TYPE_SIDE = "side";

const UNIT_OWNER_PLAYER = "player";
const UNIT_OWNER_ENEMY = "enemy";

// ---- Unit types ----
const UNIT_TYPES = {
  "dart-monkey": {
    name: "Dart Monkey",
    img: "BTD6_000-DartMonkey.png",
    speed: 60,          // pixels/sec
    range: 150,
    damage: 20,
    attackSpeed: 1.0,   // attacks/sec
    maxHp: 200,
    targetTowersFirst: true
  },
  "tack-shooter": {
    name: "Tack Shooter",
    img: "BTD6_011-TackShooter.png",
    speed: 0,
    range: 130,
    damage: 10,
    attackSpeed: 3.0,
    maxHp: 250,
    targetTowersFirst: false
  }
  // Add more later if you want
};

// ---- Elixir settings ----
const MAX_ELIXIR = 10;
const ELIXIR_REGEN_PER_SEC = 1;

// ---- Game state ----
let lastTimestamp = 0;
let gameTime = 0; // seconds elapsed
let remainingTime = GAME_DURATION_SECONDS;
let gameOver = false;

let playerElixir = 5;
let enemyElixir = 5;

let playerCrowns = 0;
let enemyCrowns = 0;

let allUnits = [];  // both sides
let allTowers = []; // all 6 towers

// Drag state (filled in Section 2)
let dragState = {
  dragging: false,
  cardIndex: null,
  cardData: null,
  valid: false
};

// Decks & hands
let playerDeck = [];
let enemyDeck = [];
let playerHand = [];
let enemyHand = [];

// Enemy AI state (logic in Section 4)
let enemyAiState = {
  nextPlayTime: 2,
  aggression: 0.5
};

// ---- Helpers ----
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// ---- Arena geometry ----
function getArenaRect() {
  const rect = arenaEl.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height
  };
}

// Convert mouse/touch coords to arena-local coords
function clientToArenaCoords(clientX, clientY) {
  const rect = getArenaRect();
  return {
    x: clientX - rect.x,
    y: clientY - rect.y
  };
}

// Check if arena Y coord is on player's side
function isOnPlayerSide(arenaY) {
  const rect = getArenaRect();
  const midY = rect.height * 0.5; // player's half = bottom 50%
  return arenaY > midY;
}

// ---- Towers ----
function createTowerFromElement(el, owner, type) {
  const rect = el.getBoundingClientRect();
  const arenaRect = getArenaRect();

  const x = rect.left - arenaRect.left + rect.width / 2;
  const y = rect.top - arenaRect.top + rect.height / 2;

  const baseHp = type === TOWER_TYPE_KING ? 5000 : 3000;

  const tower = {
    id: el.id,
    el,
    owner,
    type,
    x,
    y,
    width: rect.width,
    height: rect.height,
    maxHp: baseHp,
    hp: baseHp,
    destroyed: false
  };

  return tower;
}

function setupTowers() {
  allTowers = [];

  allTowers.push(
    createTowerFromElement(playerLeftTowerEl, ARENA_SIDE_PLAYER, TOWER_TYPE_SIDE),
    createTowerFromElement(playerRightTowerEl, ARENA_SIDE_PLAYER, TOWER_TYPE_SIDE),
    createTowerFromElement(playerKingEl, ARENA_SIDE_PLAYER, TOWER_TYPE_KING),
    createTowerFromElement(enemyLeftTowerEl, ARENA_SIDE_ENEMY, TOWER_TYPE_SIDE),
    createTowerFromElement(enemyRightTowerEl, ARENA_SIDE_ENEMY, TOWER_TYPE_SIDE),
    createTowerFromElement(enemyKingEl, ARENA_SIDE_ENEMY, TOWER_TYPE_KING)
  );
}

function updateTowerVisual(tower) {
  if (!tower.el) return;
  const ratio = tower.hp / tower.maxHp;
  tower.el.style.filter =
    ratio <= 0 ? "grayscale(1) brightness(0.4)" :
    ratio < 0.3 ? "brightness(0.5) saturate(1.5)" :
    ratio < 0.6 ? "brightness(0.7)" :
    "none";
}

// ---- Units ----
let nextUnitId = 1;

function createUnit(owner, unitTypeKey, x, y) {
  const def = UNIT_TYPES[unitTypeKey];
  if (!def) {
    console.warn("Unknown unit type:", unitTypeKey);
    return null;
  }

  const unitEl = document.createElement("div");
  unitEl.className = "unit";
  const img = document.createElement("img");
  img.src = `images/${def.img}`;
  img.alt = def.name;
  unitEl.appendChild(img);
  unitLayerEl.appendChild(unitEl);

  const unit = {
    id: nextUnitId++,
    owner,
    typeKey: unitTypeKey,
    def,
    x,
    y,
    width: 60,
    height: 60,
    hp: def.maxHp,
    maxHp: def.maxHp,
    moveSpeed: def.speed,
    range: def.range,
    damage: def.damage,
    attackSpeed: def.attackSpeed,
    attackCooldown: 0,
    targetId: null,
    el: unitEl,
    dead: false
  };

  allUnits.push(unit);
  positionUnitEl(unit);
  return unit;
}

function positionUnitEl(unit) {
  const left = unit.x - unit.width / 2;
  const top = unit.y - unit.height / 2;

  unit.el.style.position = "absolute";
  unit.el.style.left = `${left}px`;
  unit.el.style.top = `${top}px`;
  unit.el.style.width = `${unit.width}px`;
  unit.el.style.height = `${unit.height}px`;
  unit.el.style.zIndex = unit.owner === UNIT_OWNER_PLAYER ? 18 : 17;
}

function removeDeadUnits() {
  allUnits = allUnits.filter(u => {
    if (u.dead) {
      if (u.el && u.el.parentNode) {
        u.el.parentNode.removeChild(u.el);
      }
      return false;
    }
    return true;
  });
}

// ---- Decks & hands ----
function defaultPlayerDeck() {
  return [
    { id: "card-dart-1", unitType: "dart-monkey", cost: 3, img: UNIT_TYPES["dart-monkey"].img },
    { id: "card-tack-1", unitType: "tack-shooter", cost: 4, img: UNIT_TYPES["tack-shooter"].img },
    { id: "card-dart-2", unitType: "dart-monkey", cost: 2, img: UNIT_TYPES["dart-monkey"].img },
    { id: "card-tack-2", unitType: "tack-shooter", cost: 5, img: UNIT_TYPES["tack-shooter"].img }
  ];
}

function defaultEnemyDeck() {
  return [
    { id: "e-dart-1", unitType: "dart-monkey", cost: 3, img: UNIT_TYPES["dart-monkey"].img },
    { id: "e-tack-1", unitType: "tack-shooter", cost: 4, img: UNIT_TYPES["tack-shooter"].img },
    { id: "e-dart-2", unitType: "dart-monkey", cost: 2, img: UNIT_TYPES["dart-monkey"].img },
    { id: "e-tack-2", unitType: "tack-shooter", cost: 5, img: UNIT_TYPES["tack-shooter"].img }
  ];
}

function initDecksAndHands() {
  playerDeck = defaultPlayerDeck();
  enemyDeck = defaultEnemyDeck();

  playerHand = playerDeck.slice(0, 4);
  enemyHand = enemyDeck.slice(0, 4);
}

// Rotate deck Clash-style
function rotateDeck(deck) {
  const card = deck.shift();
  deck.push(card);
  return deck[0];
}

// ---- UI: render player hand ----
function renderPlayerHand() {
  cardHandEl.innerHTML = "";

  playerHand.forEach((card, index) => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.dataset.index = index;

    const img = document.createElement("img");
    img.src = `images/${card.img}`;
    img.alt = card.unitType;

    const costEl = document.createElement("div");
    costEl.className = "card-cost";
    costEl.textContent = card.cost;

    cardEl.appendChild(img);
    cardEl.appendChild(costEl);

    // Drag handlers come in Section 2
    cardEl.addEventListener("mousedown", (e) => onCardDragStart(e, index));
    cardEl.addEventListener("touchstart", (e) => onCardDragStart(e, index), { passive: false });

    cardHandEl.appendChild(cardEl);
  });
}

// ---- UI: elixir, crowns, timer ----
function updateElixirUi() {
  const ratio = clamp(playerElixir / MAX_ELIXIR, 0, 1);
  elixirFillEl.style.width = `${ratio * 100}%`;
  elixirCountEl.textContent = Math.floor(playerElixir);
}

function updateCrownsUi() {
  playerCrownsEl.textContent = playerCrowns;
  enemyCrownsEl.textContent = enemyCrowns;
}

function updateTimerUi() {
  timerEl.textContent = formatTime(remainingTime);
}

// ---- Placeholder drag handler (implemented in Section 2) ----
function onCardDragStart(e, handIndex) {
  // Implemented fully in Section 2
}

// ---- Init ----
function initGame() {
  getArenaRect();       // force layout
  setupTowers();
  initDecksAndHands();
  renderPlayerHand();
  updateElixirUi();
  updateCrownsUi();
  remainingTime = GAME_DURATION_SECONDS;
  updateTimerUi();
  // Game loop wiring in Section 5
}

window.addEventListener("load", () => {
  initGame();
});
// ==============================
// Monkey Royale - play.js
// Section 2/5: Drag & Drop, Placement, Spawning
// ==============================

// ---- Drag Start ----
function onCardDragStart(e, handIndex) {
  if (gameOver) return;

  e.preventDefault();

  const card = playerHand[handIndex];
  if (!card) return;

  if (playerElixir < card.cost) {
    // Not enough elixir
    return;
  }

  dragState.dragging = true;
  dragState.cardIndex = handIndex;
  dragState.cardData = card;

  // Show ghost unit
  ghostUnitEl.src = `images/${card.img}`;
  ghostUnitEl.style.display = "block";

  // Show placement circle
  placementCircleEl.style.display = "block";

  // Start tracking movement
  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", onDragEnd);

  window.addEventListener("touchmove", onDragMove, { passive: false });
  window.addEventListener("touchend", onDragEnd);
}

// ---- Drag Move ----
function onDragMove(e) {
  if (!dragState.dragging) return;

  let clientX, clientY;

  if (e.touches) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  const arenaPos = clientToArenaCoords(clientX, clientY);

  // Move ghost unit
  ghostUnitEl.style.left = `${clientX - 40}px`;
  ghostUnitEl.style.top = `${clientY - 40}px`;

  // Move placement circle
  placementCircleEl.style.left = `${clientX - 60}px`;
  placementCircleEl.style.top = `${clientY - 60}px`;

  // Validate placement
  const rect = getArenaRect();
  const insideArena =
    arenaPos.x >= 0 &&
    arenaPos.x <= rect.width &&
    arenaPos.y >= 0 &&
    arenaPos.y <= rect.height;

  const onPlayerSide = isOnPlayerSide(arenaPos.y);

  dragState.valid = insideArena && onPlayerSide;

  placementCircleEl.style.borderColor = dragState.valid
    ? "rgba(0,255,100,0.8)"
    : "rgba(255,0,0,0.8)";
}

// ---- Drag End ----
function onDragEnd(e) {
  if (!dragState.dragging) return;

  // Stop tracking
  window.removeEventListener("mousemove", onDragMove);
  window.removeEventListener("mouseup", onDragEnd);

  window.removeEventListener("touchmove", onDragMove);
  window.removeEventListener("touchend", onDragEnd);

  // Hide visuals
  ghostUnitEl.style.display = "none";
  placementCircleEl.style.display = "none";

  if (dragState.valid) {
    // Convert to arena coords
    let clientX, clientY;

    if (e.changedTouches) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const arenaPos = clientToArenaCoords(clientX, clientY);

    // Spawn unit
    spawnPlayerUnit(dragState.cardData.unitType, arenaPos.x, arenaPos.y);

    // Spend elixir
    playerElixir -= dragState.cardData.cost;
    updateElixirUi();

    // Rotate deck
    const newCard = rotateDeck(playerDeck);
    playerHand[dragState.cardIndex] = newCard;
    renderPlayerHand();
  }

  // Reset drag state
  dragState.dragging = false;
  dragState.cardIndex = null;
  dragState.cardData = null;
  dragState.valid = false;
}

// ---- Spawn Player Unit ----
function spawnPlayerUnit(unitType, x, y) {
  createUnit(UNIT_OWNER_PLAYER, unitType, x, y);
}

// ---- Spawn Enemy Unit (AI uses this) ----
function spawnEnemyUnit(unitType, x, y) {
  createUnit(UNIT_OWNER_ENEMY, unitType, x, y);
}
// ==============================
// Monkey Royale - play.js
// Section 3/5: Unit movement, targeting, combat, tower damage
// ==============================

// ---- Distance helper ----
function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ---- Find nearest enemy unit or tower ----
function findNearestTarget(unit) {
  let best = null;
  let bestDist = Infinity;

  // 1. Enemy units
  for (const other of allUnits) {
    if (other.owner !== unit.owner && !other.dead) {
      const d = dist(unit, other);
      if (d < bestDist) {
        bestDist = d;
        best = other;
      }
    }
  }

  // 2. Enemy towers
  for (const tower of allTowers) {
    if (tower.owner !== unit.owner && !tower.destroyed) {
      const d = dist(unit, tower);
      if (d < bestDist) {
        bestDist = d;
        best = tower;
      }
    }
  }

  return best;
}

// ---- Move unit toward target ----
function moveUnitToward(unit, target, dt) {
  if (unit.def.speed <= 0) return; // stationary units like tack shooter

  const dx = target.x - unit.x;
  const dy = target.y - unit.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < 1) return;

  const vx = (dx / len) * unit.moveSpeed * dt;
  const vy = (dy / len) * unit.moveSpeed * dt;

  unit.x += vx;
  unit.y += vy;

  positionUnitEl(unit);
}

// ---- Deal damage to a unit ----
function damageUnit(unit, amount) {
  unit.hp -= amount;
  if (unit.hp <= 0) {
    unit.dead = true;
  }
}

// ---- Deal damage to a tower ----
function damageTower(tower, amount) {
  tower.hp -= amount;

  if (tower.hp <= 0 && !tower.destroyed) {
    tower.destroyed = true;
    tower.el.style.filter = "grayscale(1) brightness(0.4)";
    tower.el.style.opacity = "0.6";

    if (tower.owner === ARENA_SIDE_ENEMY) {
      playerCrowns++;
    } else {
      enemyCrowns++;
    }

    updateCrownsUi();

    // King tower destroyed = instant win
    if (tower.type === TOWER_TYPE_KING) {
      gameOver = true;
    }
  }

  updateTowerVisual(tower);
}

// ---- Unit attack logic ----
function unitAttack(unit, target, dt) {
  unit.attackCooldown -= dt;
  if (unit.attackCooldown > 0) return;

  const d = dist(unit, target);
  if (d <= unit.range) {
    // Attack!
    unit.attackCooldown = 1 / unit.attackSpeed;

    if (target.hp !== undefined) {
      // Target is a unit
      damageUnit(target, unit.damage);
    } else {
      // Target is a tower
      damageTower(target, unit.damage);
    }
  }
}

// ---- Update all units ----
function updateUnits(dt) {
  for (const unit of allUnits) {
    if (unit.dead) continue;

    // Acquire target if none
    let target = null;

    if (unit.targetId) {
      // Try to find existing target
      target = allUnits.find(u => u.id === unit.targetId && !u.dead);
      if (!target) {
        target = allTowers.find(t => t.id === unit.targetId && !t.destroyed);
      }
    }

    // If no valid target, find a new one
    if (!target) {
      target = findNearestTarget(unit);
      if (target) {
        unit.targetId = target.id;
      }
    }

    if (!target) continue;

    const d = dist(unit, target);

    if (d > unit.range) {
      // Move toward target
      moveUnitToward(unit, target, dt);
    } else {
      // Attack
      unitAttack(unit, target, dt);
    }
  }

  // Cleanup dead units
  removeDeadUnits();
}
// ==============================
// Monkey Royale - play.js
// Section 4/5: Enemy AI
// ==============================

// ---- AI: choose a lane (left, right, or center) ----
function aiChooseLane() {
  const r = Math.random();
  if (r < 0.33) return "left";
  if (r < 0.66) return "right";
  return "center";
}

// ---- AI: pick a card from hand that it can afford ----
function aiChooseCard() {
  const affordable = enemyHand.filter(c => enemyElixir >= c.cost);
  if (affordable.length === 0) return null;

  // Slight bias toward cheaper cards
  affordable.sort((a, b) => a.cost - b.cost);

  // 50% chance pick cheapest, 50% random affordable
  if (Math.random() < 0.5) return affordable[0];

  return affordable[Math.floor(Math.random() * affordable.length)];
}

// ---- AI: pick a placement position on enemy side ----
function aiChoosePlacement(lane) {
  const rect = getArenaRect();

  const y = rect.height * 0.25; // enemy side (top quarter)

  let x;
  if (lane === "left") x = rect.width * 0.25;
  else if (lane === "right") x = rect.width * 0.75;
  else x = rect.width * 0.5;

  return { x, y };
}

// ---- AI: detect if player is pushing a lane ----
function aiDetectPlayerPush() {
  let leftCount = 0;
  let rightCount = 0;

  for (const u of allUnits) {
    if (u.owner === UNIT_OWNER_PLAYER) {
      if (u.x < getArenaRect().width * 0.5) leftCount++;
      else rightCount++;
    }
  }

  if (leftCount > rightCount + 2) return "left";
  if (rightCount > leftCount + 2) return "right";
  return null;
}

// ---- AI: main decision logic ----
function updateEnemyAI(dt) {
  if (gameOver) return;

  enemyAiState.nextPlayTime -= dt;
  if (enemyAiState.nextPlayTime > 0) return;

  // Reset timer for next decision
  enemyAiState.nextPlayTime = 1.5 + Math.random() * 1.5;

  // Try to pick a card
  const card = aiChooseCard();
  if (!card) return;

  // Detect if player is pushing a lane
  const threatenedLane = aiDetectPlayerPush();

  let lane;
  if (threatenedLane) {
    // Defend that lane
    lane = threatenedLane;
  } else {
    // Otherwise pick a random lane
    lane = aiChooseLane();
  }

  // Pick placement
  const pos = aiChoosePlacement(lane);

  // Spawn enemy unit
  spawnEnemyUnit(card.unitType, pos.x, pos.y);

  // Spend elixir
  enemyElixir -= card.cost;

  // Rotate deck
  const newCard = rotateDeck(enemyDeck);
  const index = enemyHand.findIndex(c => c.id === card.id);
  if (index !== -1) {
    enemyHand[index] = newCard;
  }
}
// ==============================
// Monkey Royale - play.js
// Section 5/5: Game loop, timer, elixir regen, win/lose
// ==============================

// ---- Elixir regen ----
function updateElixir(dt) {
  if (gameOver) return;

  playerElixir += ELIXIR_REGEN_PER_SEC * dt;
  enemyElixir += ELIXIR_REGEN_PER_SEC * dt;

  playerElixir = clamp(playerElixir, 0, MAX_ELIXIR);
  enemyElixir = clamp(enemyElixir, 0, MAX_ELIXIR);

  updateElixirUi();
}

// ---- Timer ----
function updateTimer(dt) {
  if (gameOver) return;

  remainingTime -= dt;
  if (remainingTime <= 0) {
    remainingTime = 0;
    gameOver = true;
  }

  updateTimerUi();
}

// ---- Win/Lose ----
function checkGameOver() {
  if (!gameOver) return;

  // Determine winner
  let result = "";

  if (playerCrowns > enemyCrowns) {
    result = "You Win!";
  } else if (enemyCrowns > playerCrowns) {
    result = "You Lose!";
  } else {
    result = "Draw!";
  }

  // Show result overlay
  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.7)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.fontSize = "64px";
  overlay.style.color = "white";
  overlay.style.zIndex = "999";
  overlay.textContent = result;

  document.body.appendChild(overlay);
}

// ---- Main game loop ----
function gameLoop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = (timestamp - lastTimestamp) / 1000; // convert ms → seconds
  lastTimestamp = timestamp;

  if (!gameOver) {
    updateUnits(dt);
    updateEnemyAI(dt);
    updateElixir(dt);
    updateTimer(dt);
  }

  checkGameOver();

  requestAnimationFrame(gameLoop);
}

// ---- Start game ----
window.addEventListener("load", () => {
  initGame();
  requestAnimationFrame(gameLoop);
});
