console.log("Menu loaded successfully");

document.getElementById("play-btn").addEventListener("click", () => {
  window.location.href = "play.html";
});

document.getElementById("cards-btn").addEventListener("click", () => {
  window.location.href = "cards.html";
});

document.getElementById("shop-btn").addEventListener("click", () => {
  alert("Shop coming soon");
});

document.getElementById("settings-btn").addEventListener("click", () => {
  alert("Settings coming soon");
});
