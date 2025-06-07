const fs = require('fs');
const { Connection, Keypair, PublicKey, sendAndConfirmTransaction } = require('@solana/web3.js');
const { Jupiter, RouteMap } = require('@jup-ag/core');
require('dotenv').config();

const RPC_URL = 'https://api.mainnet-beta.solana.com'; // Replace if using custom RPC
const connection = new Connection(RPC_URL, 'confirmed');

// Load wallet keypair
const keypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(process.env.KEYPAIR_PATH, 'utf-8')))
);

// Base token is usually SOL or USDC
const BASE_MINT = new PublicKey('So11111111111111111111111111111111111111112'); // SOL

async function buyToken(targetMint, amountInSol = 0.01) {
  try {
    const jupiter = await Jupiter.load({
      connection,
      cluster: 'mainnet-beta',
      user: keypair,
    });

    const inputMint = BASE_MINT;
    const outputMint = new PublicKey(targetMint);

    const amount = amountInSol * 1e9; // Convert SOL to lamports

    const routes = await jupiter.computeRoutes({
      inputMint,
      outputMint,
      amount,
      slippageBps: 100, // 1% slippage
    });

    if (!routes.routesInfos.length) {
      console.log('❌ No route found for token:', targetMint);
      return;
    }

    const route = routes.routesInfos[0];

    const { execute } = await jupiter.exchange({
      routeInfo: route,
    });

    const txid = await execute();
    console.log(`✅ Buy successful. TX: ${txid}`);
    return txid;
  } catch (err) {
    console.error('❌ Trade failed:', err.message);
  }
}

module.exports = buyToken;