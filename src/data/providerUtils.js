const DEFAULT_TIMEOUT_MS = 6000;

function disabledStatus(source, note = "API key not configured or provider disabled") {
  return {
    status: "DISABLED",
    source,
    notes: [note]
  };
}

function failedStatus(source, error) {
  return {
    status: "FAILED",
    source,
    notes: [error?.message || String(error || "provider failed")]
  };
}

async function fetchJson(url, options = {}) {
  const text = await fetchText(url, options);
  return JSON.parse(text);
}

async function fetchText(url, options = {}) {
  if (typeof fetch !== "function") {
    throw new Error("global fetch is not available in this Node runtime");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: options.headers || {},
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function statusLabel(status) {
  return {
    CONNECTED: "연결됨",
    PARTIAL: "일부 연결",
    FAILED: "실패",
    DISABLED: "미연결"
  }[status] || "미연결";
}

function aggregateStatus(values) {
  const statuses = values.filter(Boolean);
  if (!statuses.length) return "DISABLED";
  if (statuses.every((status) => status === "CONNECTED")) return "CONNECTED";
  if (statuses.some((status) => status === "CONNECTED" || status === "PARTIAL")) return "PARTIAL";
  if (statuses.some((status) => status === "FAILED")) return "FAILED";
  return "DISABLED";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

module.exports = {
  aggregateStatus,
  clamp,
  disabledStatus,
  failedStatus,
  fetchJson,
  fetchText,
  statusLabel
};
