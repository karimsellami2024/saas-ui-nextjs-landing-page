// pages/api/vehicules/options.js
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Hardcode or override with env var if you prefer
  const BASE = process.env.VEHICULES_BASE
    || "https://vehiculecanada-592102073404.us-central1.run.app";

  // Build upstream URL with the same query params (?year=YYYY&make=MAKE)
  const url = new URL("/options", BASE);
  const qp = req.query || {};
  for (const [k, v] of Object.entries(qp)) {
    if (Array.isArray(v)) url.searchParams.set(k, v[0]);
    else if (v != null) url.searchParams.set(k, String(v));
  }

  try {
    const upstream = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      // No credentials; this is a public Cloud Run endpoint
      credentials: "omit",
      cache: "no-store",
    });

    const ct = upstream.headers.get("content-type") || "";
    const payload = ct.includes("application/json")
      ? await upstream.json().catch(() => ({}))
      : { error: await upstream.text().catch(() => "Non-JSON response") };

    if (!upstream.ok) {
      return res.status(502).json({
        error: "Upstream /options failed",
        details: payload?.error || payload,
        status: upstream.status,
      });
    }

    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({
      error: "Error fetching /options",
      details: err?.message || String(err),
    });
  }
}
