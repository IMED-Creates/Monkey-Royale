// Back button
document.getElementById("back-btn").addEventListener("click", () => {
  window.location.href = "index.html";
});

// Loadout array (8 slots)
let loadout = JSON.parse(localStorage.getItem("loadout")) || Array(8).fill(null);

// Render loadout on page load
function renderLoadout() {
  document.querySelectorAll(".slot").forEach((slot, index) => {
    slot.innerHTML = "";

    if (loadout[index]) {
      const img = document.createElement("img");
      img.src = loadout[index].img;
      img.alt = loadout[index].name;
      img.onerror = () => {
        img.src = "images/fallback.png"; // optional fallback image
      };
      slot.appendChild(img);
    }
  });
}

renderLoadout();

// Convert filename → readable name
function formatName(filename) {
  let name = filename.replace(".png", "");
  name = name.replace("BTD6_", "");
  name = name.replace(/^\d+-/, ""); // remove number prefix
  name = name.replace(/([a-z])([A-Z])/g, "$1 $2"); // split CamelCase
  name = name.replace(/Monkey Sub/, "Monkey Submarine");
  name = name.replace(/Monkey Buccaneer/, "Monkey Pirate");
  return name.trim();
}

// Load images.json and generate cards
fetch("images.json")
  .then(res => res.json())
  .then(files => {
    const container = document.getElementById("cards-container");
    if (!container) return;

    files.forEach(file => {
      const imgPath = "images/" + file;
      const name = formatName(file);

      const card = document.createElement("div");
      card.classList.add("card");
      card.dataset.id = name.toLowerCase().replace(/ /g, "-");
      card.dataset.name = name;
      card.dataset.img = imgPath;

      card.innerHTML = `
        <img src="${imgPath}" alt="${name}" onerror="this.src='images/fallback.png'">
        <h2>${name}</h2>
        <p>${name} card</p>
      `;

      // Add to loadout on click
      card.addEventListener("click", () => {
        const cardData = {
          id: card.dataset.id,
          name: card.dataset.name,
          img: card.dataset.img
        };

        const emptyIndex = loadout.findIndex(x => x === null);

        if (emptyIndex === -1) {
          alert("Loadout full. Remove a card first.");
          return;
        }

        loadout[emptyIndex] = cardData;
        localStorage.setItem("loadout", JSON.stringify(loadout));
        renderLoadout();
      });

      container.appendChild(card);
    });
  })
  .catch(err => {
    console.error("Failed to load images.json:", err);
  });

// Remove card from slot
document.querySelectorAll(".slot").forEach((slot, index) => {
  slot.addEventListener("click", () => {
    loadout[index] = null;
    localStorage.setItem("loadout", JSON.stringify(loadout));
    renderLoadout();
  });
});
