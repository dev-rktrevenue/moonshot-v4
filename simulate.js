// simulate.js

const fs = require('fs');
const path = require('path');
const { enterTrade, checkForExits } = require('./trade');
const { sendTelegram } = require('./telegram');

// Load mock token data
const watchlistPath = path.join(__dirname, 'testWatchlist.json');
const watchlist = JSON.parse(fs.readFileSync(watchlistPath, 'utf-8'));

// Step 1: Enter trades (marked as simulated)
console.log('🚀 Simulating trade entries...');
for (const [address, token] of Object.entries(watchlist)) {
  enterTrade({ ...token, address }, true); // <- simulation flag set to true
}

// Step 2: Simulate price updates
setTimeout(() => {
  console.log('\n🔁 Simulating price updates...');
  const updatedPrices = {};

  for (const [address, token] of Object.entries(watchlist)) {
    const simulateLoss = Math.random() < 0.5; // 50% chance of loss

    let multiplier;
    if (simulateLoss) {
      // Simulate a drop: -30% to -70%
      const dropPercent = 0.3 + Math.random() * 0.4;
      multiplier = 1 - dropPercent;
    } else {
      // Simulate a pump: +100% to +150%
      multiplier = 2 + Math.random() * 0.5;
    }
    
    const newPrice = parseFloat((token.price * multiplier).toFixed(6));
    updatedPrices[address] = newPrice;

    console.log(`📊 ${token.name} new simulated price: $${newPrice}`);
  }

  checkForExits(updatedPrices);
}, 5000);