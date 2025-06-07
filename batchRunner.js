const { logEvent } = require('./log');
const runTracker = require('./tracker');
const { trackSnapshots } = require('./historicalTracker');
const fs = require('fs');
const path = require('path');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBatch() {
  console.log("🚀 Starting batch...");
  logEvent('BATCH', '🚀 Starting batch...');

  // Step 1: Fetch tokens from endpoint
  const tokens = await runTracker();
  console.log(`📥 Fetched ${tokens.length} tokens from source`);
  logEvent('BATCH', `📥 Fetched ${tokens.length} tokens from source`);

  // Step 2: Run historical tracker twice, every 10 seconds
  for (let i = 1; i <= 2; i++) {
    console.log(`📊 Running snapshot tracker round ${i}`);
    logEvent('HISTORY', `📊 Running snapshot tracker round ${i}`);
    await trackSnapshots();
    if (i < 2) await sleep(10000); // wait 10s before next round
  }

  // ⛔ Other steps (trades/exits) are currently commented out

  console.log("✅ Batch complete.\n----------------------------");
  logEvent('BATCH', '✅ Batch complete.');
}

module.exports = runBatch;