const fs = require('fs');
const path = require('path');
const { sendTelegram } = require('./telegram');
const { logEvent } = require('./log');
const buyToken = require('buyToken');

// File paths
const activeTradesPath = path.join(__dirname, 'activeTrades.json');
const completedTradesPath = path.join(__dirname, 'completedTrades.json');

// Load or initialize trade data
let activeTrades = fs.existsSync(activeTradesPath)
  ? JSON.parse(fs.readFileSync(activeTradesPath, 'utf-8'))
  : {};

let completedTrades = fs.existsSync(completedTradesPath)
  ? JSON.parse(fs.readFileSync(completedTradesPath, 'utf-8'))
  : {};

function saveActiveTrades() {
  fs.writeFileSync(activeTradesPath, JSON.stringify(activeTrades, null, 2));
}

function saveCompletedTrades() {
  fs.writeFileSync(completedTradesPath, JSON.stringify(completedTrades, null, 2));
}

// Called when token passes entry conditions
function enterTrade(token, isSimulation = false) {
  const entry = {
    name: token.name,
    address: token.address,
    entryPrice: token.price,
    entryTime: new Date().toISOString(),
    simulation: isSimulation
  };

  activeTrades[token.address] = entry;
  saveActiveTrades();

  const msg = `📈 Entered ${isSimulation ? '[SIM]' : '[LIVE]'} trade: ${token.name} at $${token.price}`;
  console.log(msg);
  logEvent('TRADE', msg);
  sendTelegram(msg);
}

// Check all open trades for exit conditions
function checkForExits(latestPrices, config = { profitTarget: 100, stopLoss: -50 }) {
  for (const [address, trade] of Object.entries(activeTrades)) {
    const currentPrice = latestPrices[address];
    if (!currentPrice || !trade.entryPrice) continue;

    const gain = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;

    let msg = '';
    if (gain >= config.profitTarget) {
      msg = `💰 Profit exit: ${trade.name} at $${currentPrice} (+${gain.toFixed(1)}%)`;
    } else if (gain <= config.stopLoss) {
      msg = `💀 Loss exit: ${trade.name} at $${currentPrice} (${gain.toFixed(1)}%)`;
    } else {
      continue;
    }

    const completedTrade = {
      ...trade,
      exitPrice: currentPrice,
      exitTime: new Date().toISOString(),
      gain: parseFloat(gain.toFixed(2)),
      loss: gain <= config.stopLoss
    };

    completedTrades.push(completedTrade);
    delete activeTrades[address];
    saveCompletedTrades();
    saveActiveTrades();

    console.log(msg);
    logEvent('TRADE', msg);
    sendTelegram(msg);
  }
}

module.exports = {
  enterTrade,
  checkForExits
};