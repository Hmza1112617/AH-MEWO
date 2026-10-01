const LICENSE = {
  status: true,
  message: "Authentication Successful! Welcome VIP User.",
  activated_at: "2026-01-01T00:00:00Z",
  expiry_date: "2099-12-31T23:59:59Z",
  is_trial: false,
  force_update: false,
  required_version: "",
  reason: "",
  reseller_name: "AH MEWO",
  hwid: "",
  serial: "",
  keys: { status: true },
  expiry: 4102444799
};

const ALLOWED_KEYS = new Set([
  "RLFLY-8BP-CRACK",
  "@DRR_R2"
]);

function cors(body) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
      "Cache-Control": "no-store"
    }
  });
}

function readKey(request, url) {
  const fromQuery =
    url.searchParams.get("key") ||
    url.searchParams.get("user_key") ||
    url.searchParams.get("serial") ||
    url.searchParams.get("hwid");
  if (fromQuery) return fromQuery;
  const header = request.headers.get("x-api-key") || request.headers.get("Authorization");
  if (header) return header.replace(/^Bearer\s+/i, "");
  return null;
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return cors("{}");

    const url = new URL(request.url);
    const key = readKey(request, url);

    if (key && !ALLOWED_KEYS.has(key)) {
      return cors(JSON.stringify({
        status: false,
        message: "Invalid License Key!",
        reason: "key_not_registered"
      }));
    }

    return cors(JSON.stringify(LICENSE));
  }
};
