const { failedStatus, fetchJson } = require("./providerUtils");

function emptyOptions(ticker, status, notes = []) {
  return {
    ticker,
    status,
    source: "Yahoo Finance options",
    hasOptionsData: false,
    bullishOptionsSignal: false,
    bearishOptionsSignal: false,
    unusualActivitySignal: false,
    optionsScore: 0,
    notes
  };
}

function summarizeOptionChain(ticker, payload) {
  const result = payload?.optionChain?.result?.[0];
  const optionSet = result?.options?.[0];
  if (!optionSet) {
    return emptyOptions(ticker, "PARTIAL", ["option chain is empty"]);
  }

  const calls = optionSet.calls || [];
  const puts = optionSet.puts || [];
  const callVolume = calls.reduce((sum, row) => sum + Number(row.volume || 0), 0);
  const putVolume = puts.reduce((sum, row) => sum + Number(row.volume || 0), 0);
  const totalOptionVolume = callVolume + putVolume;
  const putCallVolumeRatio = callVolume > 0 ? Number((putVolume / callVolume).toFixed(2)) : null;
  const ivValues = [...calls, ...puts].map((row) => Number(row.impliedVolatility)).filter(Number.isFinite);
  const impliedVolatilityAvg = ivValues.length ? Number((ivValues.reduce((a, b) => a + b, 0) / ivValues.length).toFixed(4)) : null;
  const bullishOptionsSignal = callVolume >= putVolume * 1.5 && totalOptionVolume > 0;
  const bearishOptionsSignal = putVolume >= callVolume * 1.5 && totalOptionVolume > 0;
  const unusualActivitySignal = totalOptionVolume >= 5000 && (bullishOptionsSignal || bearishOptionsSignal);
  const optionsScore = bullishOptionsSignal ? (unusualActivitySignal ? 10 : 6) : bearishOptionsSignal ? -4 : 0;
  return {
    ticker,
    status: "CONNECTED",
    source: "Yahoo Finance options",
    hasOptionsData: true,
    putCallVolumeRatio,
    callVolume,
    putVolume,
    totalOptionVolume,
    impliedVolatilityAvg,
    impliedVolatilityChange: null,
    nearestExpiry: optionSet.expirationDate ? new Date(optionSet.expirationDate * 1000).toISOString().slice(0, 10) : null,
    bullishOptionsSignal,
    bearishOptionsSignal,
    unusualActivitySignal,
    optionsScore,
    notes: impliedVolatilityAvg ? [] : ["IV values unavailable in option chain"]
  };
}

async function fetchOptionsFlow(ticker) {
  if (process.env.DISABLE_OPTIONS_PROVIDER === "1") {
    return emptyOptions(ticker, "DISABLED", ["DISABLE_OPTIONS_PROVIDER=1"]);
  }
  try {
    const payload = await fetchJson(`https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(ticker)}`);
    return summarizeOptionChain(ticker, payload);
  } catch (error) {
    const failed = failedStatus("Yahoo Finance options", error);
    return emptyOptions(ticker, failed.status, failed.notes);
  }
}

module.exports = {
  fetchOptionsFlow
};
