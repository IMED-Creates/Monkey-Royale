export class BananaManager {
  constructor() {
    this.max = 10;
    this.current = 5;
    this.rate = 0.5; // bananas per second
  }

  update(deltaTime) {
    this.current = Math.min(this.max, this.current + this.rate * deltaTime);
  }

  spend(amount) {
    if (this.current >= amount) {
      this.current -= amount;
      return true;
    }
    return false;
  }

  getBananas() {
    return this.current;
  }

  getMaxBananas() {
    return this.max;
  }
}
