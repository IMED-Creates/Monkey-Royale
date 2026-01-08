// Back button
document.getElementById("back-btn").addEventListener("click", () => {
  window.location.href = "index.html";
});

// Loadout array (8 slots)
let loadout = JSON.parse(localStorage.getItem("loadout")) || [null, null, null, null, null, null, null, null];

// Render loadout on page load
function renderLoadout() {
  document.querySelectorAll(".slot").forEach((slot, index) => {
    slot.innerHTML = "";

    if (loadout[index]) {
      const img = document.createElement("img");
      img.src = loadout[index].img;
      slot.appendChild(img);
    }
  });
}

renderLoadout();

// Add card to loadout
document.querySelectorAll(".card").forEach(card => {
  card.addEventListener("click", () => {
    const cardData = {
      id: card.dataset.id,
      name: card.dataset.name,
      img: card.dataset.img
    };

    // Find first empty slot
    const emptyIndex = loadout.findIndex(x => x === null);

    if (emptyIndex === -1) {
      alert("Loadout full. Remove a card first.");
      return;
    }

    loadout[emptyIndex] = cardData;
    localStorage.setItem("loadout", JSON.stringify(loadout));
    renderLoadout();
  });
});

// Remove card from slot
document.querySelectorAll(".slot").forEach(slot => {
  slot.addEventListener("click", () => {
    const index = slot.dataset.slot;
    loadout[index] = null;
    localStorage.setItem("loadout", JSON.stringify(loadout));
    renderLoadout();
  });
});
