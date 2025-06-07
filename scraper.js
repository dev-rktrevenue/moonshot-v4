const puppeteer = require('puppeteer');
const { logEvent } = require('./log');

let browser;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      userDataDir: null
    });
  }
  return browser;
}

async function fetchLiveData(mint) {
  if (typeof mint !== 'string') {
  console.error('❌ [PUMPFUN] Received non-string mint:', mint);
  throw new Error(`Invalid mint passed to fetchLiveData: ${JSON.stringify(mint)}`);
  }
  const url = `https://pump.fun/coin/${String(mint)}`;
  console.log(`🌐 [PUMPFUN] Fetching: ${url}`);
  logEvent('PUMPFUN', `🌐 Fetching: ${url}`);

  let page;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Attempt initial load with buffer time
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Modal bypass (safe)
    try {
      const buttons = await page.$$('button'); // get all buttons
      if (buttons.length > 0) {
        await page.evaluate(() => {
          const modalBtn = [...document.querySelectorAll('button')].find(btn =>
            btn.innerText.toLowerCase().includes("i'm ready to pump")
          );
          if (modalBtn) modalBtn.click();
        });
      } else {
        logEvent('PUMPFUN', `⚠️ No buttons found for modal on ${mint}`);
      }
    } catch (e) {
      logEvent('PUMPFUN', `⚠️ Modal click failed for ${mint}: ${e.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1500)); // Let DOM stabilize

    const data = await page.evaluate(() => {
      const result = {
        marketCap: null,
        price: null,
        name: null,
        ageMinutes: null,
        replies: null
      };

      // Market Cap
      const marketCapElement = document.querySelector('div.text-green-300 > span');
      const marketCapMatch = marketCapElement?.innerText?.match(/\$([\d,]+)/);
      result.marketCap = marketCapMatch ? parseFloat(marketCapMatch[1].replace(/,/g, '')) : null;

      result.price = result.marketCap ? result.marketCap / 1_000_000_000 : null;

      // Name
      const nameElement = document.querySelector('div.text-sm.font-medium');
      result.name = nameElement?.innerText?.trim() || null;

      // Age
      const ageElement = [...document.querySelectorAll('span')]
        .find(el => el.innerText.toLowerCase().includes('ago') || el.innerText.toLowerCase().includes('just now'));

      const ageText = ageElement?.innerText?.toLowerCase() || '';
      if (ageText.includes('just now')) {
        result.ageMinutes = 0;
      } else {
        const match = ageText.match(/(\d+)\s*(min|hour)/);
        if (match) {
          const value = parseInt(match[1], 10);
          result.ageMinutes = match[2].includes('hour') ? value * 60 : value;
        }
      }

      // Replies
      const repliesElement = [...document.querySelectorAll('button')]
        .find(el => el.innerText.toLowerCase().includes('replies:'));

      const repliesMatch = repliesElement?.innerText?.match(/replies:\s*(\d+)/i);
      result.replies = repliesMatch ? parseInt(repliesMatch[1], 10) : null;

      return result;
    });

    await new Promise(resolve => setTimeout(resolve, 1000)); // Give OS time to release lock

    if (!data.price || !data.marketCap) {
      const msg = `Missing price or market cap in DOM for ${mint}`;
      logEvent('PUMPFUN', `❌ ${msg}`);
      throw new Error(msg);
    }

    return {
      ts: Date.now(),
      price: parseFloat(data.price.toFixed(10)),
      marketCap: data.marketCap,
      name: data.name,
      ageMinutes: data.ageMinutes,
      replies: data.replies
    };
  } catch (err) {
    console.error(`❌ [PUMPFUN] Failed to scrape ${mint}:`, err.message);
    logEvent('PUMPFUN', `❌ Failed to scrape ${mint}: ${err.message}`);
    return null;

  } finally {
    if (page) {
      try {
        if (!page.isClosed()) {
          await page.close();
        }
      } catch (e) {
        logEvent('ERROR', `⚠️ Failed to close page for ${mint}: ${e.message}`);
      }
    }

  }
}

module.exports = fetchLiveData;