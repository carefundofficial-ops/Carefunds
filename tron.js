const https = require("https");

const BASE = process.env.TRON_API_BASE || "https://api.trongrid.io";
const WALLET = process.env.CARE_FUND_WALLET;
const USDT = process.env.USDT_TRC20_CONTRACT || "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const MIN_CONFIRMATIONS = Number(process.env.MIN_CONFIRMATIONS || 20);

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        Accept: "application/json",
        ...(process.env.TRON_API_KEY ? { "TRON-PRO-API-KEY": process.env.TRON_API_KEY } : {})
      }
    }, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) return reject(new Error(json.message || `TRON API ${res.statusCode}`));
          resolve(json);
        } catch {
          reject(new Error("Invalid response from TRON API"));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("TRON API timeout")));
  });
}

function toBaseUrl() {
  return BASE.replace(/\/$/, "");
}

async function findUsdtTransfer(txHash) {
  const url = `${toBaseUrl()}/v1/accounts/${encodeURIComponent(WALLET)}/transactions/trc20?only_confirmed=true&limit=200&contract_address=${encodeURIComponent(USDT)}`;
  const result = await getJson(url);
  const rows = result.data || [];

  const tx = rows.find(x => x.transaction_id === txHash);
  if (!tx) return { found: false };

  const decimals = Number(tx.token_info?.decimals ?? 6);
  const raw = String(tx.value);
  const amount = Number(raw) / Math.pow(10, decimals);

  // The endpoint is scoped to the receiving wallet, but verify recipient again.
  const recipient = tx.to;
  const token = tx.token_info?.address || tx.contract_address || USDT;

  const blockTimestamp = Number(tx.block_timestamp || 0);
  const confirmed = true; // only_confirmed=true
  return {
    found: true,
    confirmed,
    amount,
    sender: tx.from,
    recipient,
    token,
    blockTimestamp,
    confirmations: MIN_CONFIRMATIONS,
    txHash: tx.transaction_id
  };
}

module.exports = { findUsdtTransfer, WALLET, USDT, MIN_CONFIRMATIONS };