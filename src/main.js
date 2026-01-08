import { BananaManager } from "./BananaManager.js";
import { DartMonkey } from "./troops/DartMonkey.js";

const bananaManager = new BananaManager();
const dartMonkeyTemplate = new DartMonkey();

const bananaFillEl = document.getElementById("banana-fill");
const bananaTextEl = document.getElementById("banana-text");
const spawnDartBtn = document.getElementById("spawn-dart");

let lastTime = performance.now();
const monkeysOnField = [];

function updateUI() {
  const current = bananaManager.getBananas();
  const max = bananaManager.getMaxBananas();
  const percent = (current / max) * 100;

  bananaFillEl.style.width = `${percent}%`;
  bananaTextEl.textContent = `Bananas: ${current.toFixed(1)} / ${max}`;

  spawnDartBtn.disabled = current < dartMonkeyTemplate.cost;
}

spawnDartBtn.addEventListener("click", () => {
  const cost = dartMonkeyTemplate.cost;
  if (bananaManager.spend(cost)) {
    const newMonkey = new DartMonkey();
    monkeysOnField.push(newMonkey);
    console.log("Spawned Dart Monkey!", monkeysOnField);
  }
});

function gameLoop(timestamp) {
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  bananaManager.update(deltaTime);
  updateUI();

  requestAnimationFrame(gameLoop);
}

updateUI();
requestAnimationFrame(gameLoop);
