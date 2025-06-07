const fs = require('fs');
const path = require('path');
const { logEvent } = require('./log');
const fetchLiveData = require('./scraper');

const watchlistPath = path.join(__dirname, 'watchlist.json');

function loadWatchlist() {
  try {
    const raw = fs.readFileSync(watchlistPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    logEvent('ERROR', `❌ Failed to load watchlist: ${err.message}`);
    return {};
  }
}

//const TODAY_DIR = path.join(__dirname, 'historical', new Date().toISOString().slice(0, 10));
//if (!fs.existsSync(TODAY_DIR)) fs.mkdirSync(TODAY_DIR, { recursive: true });

async function trackSnapshots() {
  const watchlist = loadWatchlist();

  for (const [address, token] of Object.entries(watchlist)) {
    const now = new Date().toISOString();

    try {
      const data = await fetchLiveData(address); // returns { marketCap }

      if (!data || !data.marketCap) {
        logEvent('TRACKER', `⚠️ Skipped ${token.name} - no market cap`);
        continue;
      }

      // Get the initial market cap from first snapshot
      const initialMC = token.history[0]?.market_cap || token.initial_mc;

      // Calculate gain percentage
      const gainPercent = ((data.marketCap - initialMC) / initialMC) * 100;
      token.gain = parseFloat(gainPercent.toFixed(2)); // e.g., 212.34

      // Prevent duplicate timestamps
      const alreadyExists = token.history.some(h => h.time === now);
      if (!alreadyExists) {
        token.history.push({
          time: now,
          market_cap: data.marketCap
        });

        logEvent('HISTORY', `📈 ${token.name} | MC: $${data.marketCap}`);
      }

      if (token.history.length > 0) {
        const initialMC = token.history[0].market_cap;
        const gainPercent = ((data.marketCap - initialMC) / initialMC) * 100;
        token.gain = parseFloat(gainPercent.toFixed(2));
      }

      // Save updated token back to watchlist
      watchlist[address] = token;

    } catch (err) {
      logEvent('ERROR', `❌ Failed to fetch ${token.name}: ${err.message}`);
    }
  }

  // Save updated watchlist
  try {
    fs.writeFileSync(watchlistPath, JSON.stringify(watchlist, null, 2));
    logEvent('WATCHLIST', '💾 Watchlist updated with new snapshots.');
  } catch (err) {
    logEvent('ERROR', `❌ Failed to save watchlist: ${err.message}`);
  }
}

module.exports = { trackSnapshots };