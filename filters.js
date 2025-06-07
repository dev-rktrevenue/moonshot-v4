// filters.js
module.exports = function(token) {
  const maxAgeSeconds = 180;
  const maxMarketCap = 4000;
  const minVolume = 200; // replace with `minLiquidity` if you track liquidity separately

  const now = Date.now();
  const ageSeconds = (now - new Date(token.createdAt).getTime()) / 1000;

  if (ageSeconds > maxAgeSeconds) return false;
  if (token.marketCap > maxMarketCap) return false;
  if (token.volume < minVolume) return false;

  return true;
};