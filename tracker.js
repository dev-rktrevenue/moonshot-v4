// tracker.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { logEvent } = require('./log');
const filterToken = require('./filters');

const API_ENDPOINT = 'https://mooonshot-api-app.cfimgx.easypanel.host/tokens';

const watchlistPath = path.join(__dirname, 'watchlist.json');

// Load existing watchlist or start fresh
let watchlist = {};
if (fs.existsSync(watchlistPath)) {
  watchlist = JSON.parse(fs.readFileSync(watchlistPath, 'utf-8'));
}

async function runTracker() {
  try {
    const res = await axios.get(API_ENDPOINT);
    const tokens = res.data;

    let addedTokens = [];

    for (const token of tokens) {
      if (watchlist[token.address]) continue; // already watching

      if (filterToken(token)) {
        const now = new Date().toISOString();
        const entry = {
          name: token.name,
          address: token.address,
          created_at: token.createdAt,
          first_seen: now,
          initial_mc: token.marketCap,
          history: [
            { time: now, market_cap: token.marketCap }
          ],
          pumpCount: 0,
          confirmed: false
        };

        watchlist[token.address] = entry;
        addedTokens.push(entry);

        const ageSeconds = (Date.now() - new Date(token.createdAt)) / 1000;
        const ageDisplay = `${Math.floor(ageSeconds)}s`;

        console.log(`🕵️ ${token.name} | Age: ${ageDisplay} | MC: $${token.marketCap}`);

        logEvent(
          'WATCHLIST',
          `📥 ${token.name} | Age: ${ageDisplay} | MC: $${token.marketCap} | Holders: ${token.holders} | ${token.address}`
        );
      }
    }

    fs.writeFileSync(watchlistPath, JSON.stringify(watchlist, null, 2));
    logEvent('TRACKER', `✅ Tracker finished. Watchlist size: ${Object.keys(watchlist).length}`);

    return addedTokens;

  } catch (err) {
    logEvent('ERROR', `Fetch failed: ${err.message}`);
    return [];
  }
}

module.exports = runTracker;